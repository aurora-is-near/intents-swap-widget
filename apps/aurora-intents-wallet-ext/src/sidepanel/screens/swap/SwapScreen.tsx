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
import { ownAddress } from '../transfer/ownAddress';
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

/**
 * Like the widget: swap from the account's intents balance or, for a wallet
 * account, from the wallet; into either of them. "Send to another address"
 * targets any chain with a recipient instead.
 */
const filters = (hasWallet: boolean, sendsOut: boolean) => {
  const wallet = hasWallet ? ('wallet-supported' as const) : ('none' as const);

  return {
    source: { intents: 'with-balance', external: wallet } as ChainsFilter,
    target: (sendsOut
      ? { intents: 'none', external: 'all' }
      : { intents: 'all', external: wallet }) as ChainsFilter,
  };
};

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
  } = useTransferForm({ fromWallet: account.kind === 'wallet' });

  const outcome = useTransferOutcome();

  const [picker, setPicker] = useState<'none' | 'source' | 'target'>('none');
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [sendsOut, setSendsOut] = useState(false);

  const hasWallet = account.kind === 'wallet';
  const walletName = hasWallet ? account.walletName : 'your wallet';
  const chainsFilter = filters(hasWallet, sendsOut);
  const summary = getTransferSummary(ctx);
  const goHome = () => reset({ name: 'home' });

  /** Where the target goes: the account, the own wallet, or an address. */
  const destination = (() => {
    if (!summary?.recipient) {
      return 'your account';
    }

    return summary.recipient === ownAddress(account, summary.target.blockchain)
      ? walletName
      : shortAddress(summary.recipient);
  })();

  const toggleSendsOut = (isOn: boolean) => {
    setSendsOut(isOn);

    const target = ctx.targetToken;

    if (!target) {
      return;
    }

    // Off: back into the account, or the own wallet when it's on its chain.
    const own = ownAddress(account, target.blockchain);
    const keepsTarget = isOn ? !target.isIntent : target.isIntent || !!own;
    const next = keepsTarget ? target : counterpart(tokens, target, !isOn);

    if (!next) {
      fireEvent('tokenSelect', { variant: 'target', token: undefined });
    } else if (next !== target) {
      onChangeToken('target', next);
    }

    if (!isOn) {
      fireEvent('addressSet', next && !next.isIntent ? (own ?? null) : null);
    }
  };

  const noteRows = summary ? (
    <>
      <Notes.Item
        label="You pay"
        value={describeAmount(summary.amountIn, summary.source)}
      />
      {outcome.view === 'success' ? (
        <Notes.Item
          label="You received"
          value={describeAmount(
            outcome.amountOutFormatted ?? summary.amountOut,
            summary.target,
          )}
        />
      ) : (
        <Notes.Item
          label="You receive"
          value={`≈ ${describeAmount(summary.amountOut, summary.target)}`}
        />
      )}
      {summary.recipient ? (
        <Notes.Item label="Recipient" value={destination} />
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

  if (outcome.view === 'success' && summary) {
    const received = describeAmount(
      outcome.amountOutFormatted ?? summary.amountOut,
      summary.target,
    );

    return (
      <TransferResultView
        screenTitle="Swap"
        tone="success"
        title="Swap complete"
        description={
          summary.recipient
            ? `${received} sent to ${destination}.`
            : `You received ${received}.`
        }
        notes={
          <>
            {noteRows}
            {outcome.seconds !== null ? (
              <Notes.Item label="Time" value={`${outcome.seconds} sec`} />
            ) : null}
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

  if ((outcome.view === 'pending' || outcome.view === 'settling') && summary) {
    return (
      <TransferPending
        account={account}
        screenTitle="Swap"
        title={`Swapping ${summary.amountIn} ${summary.source.symbol} for ${summary.target.symbol}`}
        isSigned={outcome.isSigned}
        isFromWallet={!summary.source.isIntent}
        steps={[
          'Solvers filling your swap',
          summary.recipient
            ? `${summary.target.symbol} sent to ${destination}`
            : `${summary.target.symbol} credited to your account`,
        ]}
        notes={noteRows}
        onBack={goHome}
      />
    );
  }

  if (outcome.view === 'refunded' && summary) {
    return (
      <TransferResultView
        screenTitle="Swap"
        tone="error"
        title="Swap wasn’t filled"
        description={`Nothing was swapped. Your ${summary.amountIn} ${summary.source.symbol} is refunded to ${summary.source.isIntent ? 'your account' : walletName}.`}
        notes={noteRows}
        footer={
          <>
            <Button variant="primary" size="lg" onClick={outcome.again}>
              Try again
            </Button>
            <Button variant="outlined" size="lg" onClick={goHome}>
              Back to wallet
            </Button>
          </>
        }
        onBack={outcome.again}
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
        chainsFilter={chainsFilter[picker]}
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
              !sendsOut &&
              !!ctx.sourceToken &&
              !!ctx.targetToken &&
              (ctx.targetToken.isIntent || hasWallet)
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

      {!sendsOut && ctx.targetToken && !ctx.targetToken.isIntent ? (
        <p className="px-sw-xs text-sw-body-sm text-sw-gray-300">
          {ctx.targetToken.symbol} arrives in {walletName}
          {ctx.sendAddress ? ` (${shortAddress(ctx.sendAddress)})` : ''}.
        </p>
      ) : null}

      {isInsufficient && ctx.sourceToken ? (
        <Banner
          variant="error"
          hasBg
          multiline
          message={`You have ${describeAmount(formatTokenAmount(ctx.sourceTokenBalance, ctx.sourceToken) || '0', ctx.sourceToken)} ${ctx.sourceToken.isIntent ? 'in your account' : `in ${walletName}`}. Lower the amount or ${ctx.sourceToken.isIntent ? 'deposit more' : 'pick another token'}.`}
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
          {sendsOut && summary.recipient ? (
            <Notes.Item label="Recipient" value={destination} />
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
