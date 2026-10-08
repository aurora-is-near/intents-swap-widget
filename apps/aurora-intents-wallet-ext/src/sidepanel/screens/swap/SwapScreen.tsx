import { useState } from 'react';

import {
  Banner,
  BlockingError,
  Button,
  CHAINS,
  DirectionSwitcher,
  fireEvent,
  Notes,
  SubmitButton,
  Toggle,
  TokenInput,
  useTokens,
  useUnsafeSnapshot,
} from '@aurora-is-near/intents-swap-widget';
import type { ChainsFilter, Token } from '@aurora-is-near/intents-swap-widget';

import type { Account } from '../../accounts/types';
import { Icon } from '../../components/Icon';
import { Screen } from '../../components/Screen';
import { useNavigation } from '../../navigation';
import { shortAddress } from '../../utils';
import { RecipientField } from '../transfer/RecipientField';
import {
  describeAmount,
  formatTokenAmount,
  getTransferSummary,
} from '../transfer/summary';
import { TokenPicker } from '../transfer/TokenPicker';
import {
  NotesCard,
  TransferPending,
  TransferResultView,
} from '../transfer/TransferStatus';
import { EmptyAccount } from '../transfer/EmptyAccount';
import { useTransferForm } from '../transfer/useTransferForm';
import { useTransferOutcome } from '../transfer/useTransferOutcome';
import { SlippageScreen } from './SlippageScreen';

/** Swaps spend the account's intents balance. */
const SOURCE_FILTER: ChainsFilter = {
  intents: 'with-balance',
  external: 'none',
};

const INTENTS_TARGET: ChainsFilter = { intents: 'all', external: 'none' };
const EXTERNAL_TARGET: ChainsFilter = { intents: 'none', external: 'all' };

const ALL_CHAINS = CHAINS.map((chain) => chain.id);

/** The same asset inside the account (intents) or on its chain (external). */
const counterpart = (tokens: Token[], token: Token, isIntent: boolean) =>
  tokens.find(
    (item) =>
      item.isIntent === isIntent &&
      item.assetId === token.assetId &&
      item.blockchain === token.blockchain,
  );

const SettingsButton = ({ onClick }: { onClick: () => void }) => (
  <button
    type="button"
    aria-label="Swap settings"
    title="Swap settings"
    onClick={onClick}
    className="flex h-[40px] w-[40px] items-center justify-center rounded-sw-md text-sw-gray-200 hover:bg-sw-gray-900">
    <Icon name="settings" />
  </button>
);

export const SwapScreen = ({ account }: { account: Account }) => {
  const { back, reset } = useNavigation();
  const { ctx } = useUnsafeSnapshot();
  const { tokens, status: tokensStatus, refetch } = useTokens();
  const {
    onChangeAmount,
    onChangeToken,
    lastChangedInput,
    isLoading,
    isEmpty,
  } = useTransferForm();

  const outcome = useTransferOutcome();

  const [picker, setPicker] = useState<'none' | 'source' | 'target'>('none');
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [sendsOut, setSendsOut] = useState(false);

  const summary = getTransferSummary(ctx);
  const targetFilter = sendsOut ? EXTERNAL_TARGET : INTENTS_TARGET;
  const goHome = () => reset({ name: 'home' });

  const toggleSendsOut = (isOn: boolean) => {
    setSendsOut(isOn);

    const target = ctx.targetToken;
    const next = target ? counterpart(tokens, target, !isOn) : undefined;

    if (next) {
      onChangeToken('target', next);
    } else {
      fireEvent('tokenSelect', { variant: 'target', token: undefined });
    }

    if (!isOn) {
      fireEvent('addressSet', null);
    }
  };

  const noteRows = summary ? (
    <>
      <Notes.Item
        label="You pay"
        value={describeAmount(summary.amountIn, summary.source)}
      />
      <Notes.Item
        label={outcome.view === 'success' ? 'You received' : 'You receive'}
        value={`${outcome.view === 'success' ? '' : '≈ '}${describeAmount(summary.amountOut, summary.target)}`}
      />
      {summary.recipient ? (
        <Notes.Item label="Recipient" value={shortAddress(summary.recipient)} />
      ) : null}
      <Notes.Item label="Fees" value={summary.fee?.usd} />
    </>
  ) : null;

  if (tokensStatus === 'error') {
    return (
      <Screen title="Swap" onBack={back}>
        <BlockingError
          message="Couldn't load the token list."
          onClickRetry={() => {
            refetch().catch(() => undefined);
          }}
        />
      </Screen>
    );
  }

  if (outcome.view === 'success' && outcome.outcome && summary) {
    return (
      <TransferResultView
        screenTitle="Swap"
        tone="success"
        title="Swap complete"
        description={
          summary.recipient
            ? `${shortAddress(summary.recipient)} received ${describeAmount(summary.amountOut, summary.target)}.`
            : `You received ${describeAmount(summary.amountOut, summary.target)}.`
        }
        notes={
          <>
            {noteRows}
            <Notes.Item label="Time" value={`${outcome.outcome.seconds} sec`} />
          </>
        }
        footer={
          <>
            <Button variant="primary" size="lg" onClick={goHome}>
              Done
            </Button>
            <Button variant="outlined" size="lg" onClick={outcome.again}>
              Swap again
            </Button>
          </>
        }
        onBack={outcome.again}
      />
    );
  }

  if (outcome.view === 'pending' && summary) {
    return (
      <TransferPending
        account={account}
        screenTitle="Swap"
        title={`Swapping ${summary.amountIn} ${summary.source.symbol} for ${summary.target.symbol}`}
        isSigned={outcome.isSigned}
        steps={[
          'Solvers filling your intent',
          summary.recipient
            ? `${summary.target.symbol} sent to ${shortAddress(summary.recipient)}`
            : `${summary.target.symbol} credited to your account`,
        ]}
        notes={noteRows}
        onBack={goHome}
      />
    );
  }

  if (outcome.view === 'error' && summary) {
    return (
      <TransferResultView
        screenTitle="Swap"
        tone="error"
        title="Swap failed"
        description={
          outcome.errorMessage ??
          'The swap couldn’t be completed. Try a new quote.'
        }
        notes={noteRows}
        footer={
          <>
            <Button variant="primary" size="lg" onClick={outcome.retry}>
              Get a new quote
            </Button>
            <Button variant="outlined" size="lg" onClick={goHome}>
              Back to wallet
            </Button>
          </>
        }
        onBack={outcome.retry}
      />
    );
  }

  if (isEmpty && outcome.view === 'form') {
    return <EmptyAccount title="Swap" account={account} />;
  }

  if (picker !== 'none') {
    return (
      <TokenPicker
        variant={picker}
        chainsFilter={picker === 'source' ? SOURCE_FILTER : targetFilter}
        onSelect={(token) => {
          onChangeToken(picker, token);
          setPicker('none');
        }}
        onClose={() => setPicker('none')}
      />
    );
  }

  if (isSettingsOpen) {
    return <SlippageScreen onBack={() => setIsSettingsOpen(false)} />;
  }

  const isInsufficient = ctx.error?.code === 'SOURCE_BALANCE_INSUFFICIENT';
  const isQuoting = ctx.quoteStatus === 'pending' && !ctx.quote;

  return (
    <Screen
      title="Swap"
      onBack={back}
      action={<SettingsButton onClick={() => setIsSettingsOpen(true)} />}
      className="gap-sw-md"
      footer={
        <SubmitButton
          label={sendsOut ? 'Swap & send' : 'Swap'}
          onSuccess={outcome.onSuccess}
        />
      }>
      {tokensStatus === 'pending' || isLoading ? (
        <div className="flex flex-col gap-sw-xs">
          <TokenInput.Skeleton />
          <TokenInput.Skeleton />
        </div>
      ) : (
        <div className="relative flex shrink-0 flex-col gap-sw-xs">
          <TokenInput.Source
            heading="Sell"
            isChanging={lastChangedInput === 'source'}
            onMsg={(msg) => {
              switch (msg.type) {
                case 'on_change_amount':
                  onChangeAmount('source', msg.amount);
                  break;
                case 'on_select_token':
                  onChangeToken('source', msg.token);
                  break;
                default:
                  setPicker('source');
              }
            }}
          />
          <DirectionSwitcher
            isEnabled={
              !sendsOut && !!ctx.sourceToken && !!ctx.targetToken?.isIntent
            }
            isLoading={ctx.quoteStatus === 'pending'}
            onClick={() => fireEvent('tokenSelectRotate', null)}
          />
          <TokenInput.Target
            heading="Buy"
            isChanging={lastChangedInput === 'target'}
            onMsg={(msg) => {
              switch (msg.type) {
                case 'on_change_amount':
                  onChangeAmount('target', msg.amount);
                  break;
                case 'on_select_token':
                  onChangeToken('target', msg.token);
                  break;
                default:
                  setPicker('target');
              }
            }}
          />
        </div>
      )}

      <div className="flex shrink-0 items-center justify-between gap-sw-md rounded-sw-md bg-sw-gray-900 px-sw-xl py-sw-lg">
        <div className="flex flex-col gap-sw-xs">
          <span className="text-sw-label-md text-sw-gray-50">
            Send to another address
          </span>
          <span className="text-sw-label-sm text-sw-gray-300">
            Swap and withdraw to a wallet outside this account
          </span>
        </div>
        <Toggle isOn={sendsOut} onToggle={toggleSendsOut} />
      </div>

      {sendsOut && ctx.targetToken && !ctx.targetToken.isIntent ? (
        <RecipientField
          label={`Receive ${ctx.targetToken.symbol} at`}
          account={account}
          target={ctx.targetToken}
          networks={ALL_CHAINS}
          wrongNetworkHint={(network) =>
            `Pick a token on ${network} or paste a ${ctx.targetToken?.chainName ?? ''} address.`
          }
        />
      ) : null}

      {isInsufficient && ctx.sourceToken ? (
        <Banner
          variant="error"
          hasBg
          multiline
          message={`You have ${describeAmount(formatTokenAmount(ctx.sourceTokenBalance, ctx.sourceToken) || '0', ctx.sourceToken)}. Lower the amount or deposit more.`}
        />
      ) : null}

      {summary && ctx.sourceTokenAmount ? (
        <NotesCard>
          <Notes.Item label="Rate" value={summary.rate} isLoading={isQuoting} />
          <Notes.Item
            label="Fees"
            value={
              summary.fee
                ? `${summary.fee.usd} · ${summary.fee.percent}`
                : undefined
            }
            isLoading={isQuoting}
          />
          {summary.recipient ? (
            <Notes.Item
              label="Recipient"
              value={shortAddress(summary.recipient)}
            />
          ) : null}
          <Notes.Item
            label="Max slippage"
            value={`${ctx.maxSlippage / 100}%`}
          />
          <Notes.Item
            label="Estimated time"
            value={
              summary.timeEstimate ? `~ ${summary.timeEstimate} sec` : undefined
            }
            isLoading={isQuoting}
          />
        </NotesCard>
      ) : null}
    </Screen>
  );
};
