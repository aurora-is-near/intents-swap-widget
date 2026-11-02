import { useEffect, useState } from 'react';

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
import { useAccounts } from '../../accounts/useAccounts';
import { Icon } from '../../components/Icon';
import { Screen } from '../../components/Screen';
import { useNavigation } from '../../navigation';
import { formatAmount, shortAddress } from '../../utils';
import { ownAddress, sameAddress } from '../transfer/ownAddress';
import { InlineAmount, InlineChain } from '../transfer/InlineAsset';
import { RecipientField } from '../transfer/RecipientField';
import { SourceRow } from '../transfer/SourceRow';
import { TransferLegs } from '../transfer/TransferLegs';
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
import { TransferTabs } from '../transfer/TransferTabs';
import { useTransferForm } from '../transfer/useTransferForm';
import { useTransferOutcome } from '../transfer/useTransferOutcome';
import {
  receiveOptions,
  recipientOptions,
  walletNameAt,
} from '../transfer/walletOptions';
import { WalletPicker } from '../transfer/WalletPicker';
import { WalletSelector } from '../transfer/WalletSelector';
import { SlippageScreen } from './SlippageScreen';

/**
 * Like the widget: swap from the primary wallet (with the account's intents
 * balance) or a secondary wallet ("From"). Buy anything on any chain: into
 * the account — from a secondary wallet too, as a deposit — one of the
 * account's wallets on that chain ("To"), or else an address ("Send to
 * another address", forced on when no wallet is on that chain). Picking an
 * account token turns sending out off.
 */
const TARGET_FILTER: ChainsFilter = { intents: 'all', external: 'all' };

const ALL_CHAINS = CHAINS.map((chain) => chain.id);

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

export const SwapScreen = ({
  account,
  source: preferredSource,
}: {
  account: Account;
  source?: Token;
}) => {
  const { back, reset } = useNavigation();
  const { ctx } = useUnsafeSnapshot();
  const { secondaries } = useAccounts();
  const { status: tokensStatus, refetch } = useTokens();
  const {
    onChangeAmount,
    onChangeToken,
    lastChangedInput,
    source,
    wallet,
    sourceName,
    sourceFilter,
    changeSource,
    changeSourceKeepingToken,
    isLoading,
    isEmpty,
  } = useTransferForm({ account, preferredSource });

  const outcome = useTransferOutcome();

  const [picker, setPicker] = useState<'none' | 'source' | 'target'>('none');
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [sendsOut, setSendsOut] = useState(false);

  const summary = getTransferSummary(ctx);
  const goHome = () => reset({ name: 'home' });

  // The account's wallets on the target chain, other than the one spending.
  const recipients = ctx.targetToken
    ? recipientOptions(
        account,
        secondaries,
        ctx.targetToken.blockchain,
        wallet?.address,
      )
    : [];

  /** Where the target goes: the account, one of its wallets, or an address. */
  const destination = (() => {
    if (!summary?.recipient) {
      return 'your account';
    }

    return (
      walletNameAt(account, secondaries, summary.recipient) ??
      shortAddress(summary.recipient)
    );
  })();

  const onChainTarget =
    ctx.targetToken && !ctx.targetToken.isIntent ? ctx.targetToken : undefined;

  // "To": the account's wallets on the target chain, the spending one first.
  const receivers = onChainTarget
    ? receiveOptions(
        account,
        secondaries,
        onChainTarget.blockchain,
        wallet?.address,
      )
    : [];

  const receiversKey = receivers.map((option) => option.address).join();

  // A token on a chain none of the account's wallets is on can only go to an
  // address typed in: the toggle turns on and stays on until such a token is
  // picked.
  const isSendOutRequired = !!onChainTarget && receivers.length === 0;

  const targetNetwork = ctx.targetToken?.chainName ?? '';
  const walletNames = [
    ...(account.kind === 'wallet' ? [account.name] : []),
    ...secondaries.map((item) => item.name),
  ];

  const requiredHint = (() => {
    if (walletNames.length === 0) {
      return `Enter a ${targetNetwork} address to receive it.`;
    }

    const who =
      walletNames.length === 1
        ? `${walletNames[0] ?? ''} doesn’t`
        : 'None of your wallets';

    return `${who} support ${targetNetwork} chain. Enter external ${targetNetwork} address.`;
  })();

  // Not sending out: the token arrives in one of the account's wallets ("To").
  // A wallet that isn't on the new target chain hands over to one that is.
  useEffect(() => {
    const first = receivers[0];

    if (
      !sendsOut &&
      first &&
      !receivers.some((option) => sameAddress(option.address, ctx.sendAddress))
    ) {
      fireEvent('addressSet', first.address);
    }
  }, [sendsOut, receiversKey, ctx.sendAddress]);

  useEffect(() => {
    if (isSendOutRequired) {
      setSendsOut(true);
    }
  }, [isSendOutRequired]);

  // Flipping makes the target the source: from the account when it's an
  // intents token, else from the wallet it's on (the spending one).
  const canFlip =
    !sendsOut &&
    !!ctx.sourceToken &&
    !!ctx.targetToken &&
    (ctx.targetToken.isIntent ||
      (!!wallet && !!ownAddress(wallet, ctx.targetToken.blockchain)));

  const flip = () => {
    const target = ctx.targetToken;

    if (!target) {
      return;
    }

    fireEvent('tokenSelectRotate', null);

    // Account tokens are spent from the primary.
    if (target.isIntent) {
      changeSourceKeepingToken({ kind: 'primary' });
    }
  };

  /**
   * The widget's auto-switching (off for the extension, so Send can target
   * its source token): the other side's token flips the two around.
   */
  const selectToken = (variant: 'source' | 'target', token: Token) => {
    const other = variant === 'source' ? ctx.targetToken : ctx.sourceToken;
    const isOther =
      !!other &&
      other.assetId === token.assetId &&
      other.isIntent === token.isIntent &&
      other.blockchain === token.blockchain;

    const current = variant === 'source' ? ctx.sourceToken : ctx.targetToken;

    if (!isOther) {
      onChangeToken(variant, token);

      // Into the account: nothing to send out (a forced toggle turns off).
      if (variant === 'target' && token.isIntent && sendsOut) {
        setSendsOut(false);
        fireEvent('addressSet', null);
      }
    } else if (current) {
      // As the widget: with nothing to flip to, picking the other side's
      // token does nothing.
      flip();
    }
  };

  // On: the address starts as the "To" wallet's, to edit. Off: back to a
  // wallet (the effect above picks one when the typed address isn't).
  const toggleSendsOut = (isOn: boolean) => setSendsOut(isOn);

  const receiver =
    receivers.find((option) => sameAddress(option.address, ctx.sendAddress)) ??
    receivers[0];

  const [isPickingReceiver, setIsPickingReceiver] = useState(false);

  const noteRows = summary ? (
    <>
      <Notes.Item
        label="You pay"
        value={describeAmount(summary.amountIn, summary.source)}
      />
      <Notes.Item
        label="You receive"
        value={`≈ ${describeAmount(summary.amountOut, summary.target)}`}
      />
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
    const received = outcome.amountOutFormatted
      ? formatAmount(outcome.amountOutFormatted)
      : summary.amountOut;

    return (
      <TransferResultView
        screenTitle="Swap"
        tone="success"
        title="Swap complete"
        description={
          summary.recipient
            ? `Sent to ${destination}.`
            : 'It’s in your account.'
        }
        details={
          <TransferLegs
            from={{
              label: 'You paid',
              leg: {
                token: summary.source,
                amount: summary.amountIn,
                usd: summary.amountInUsd,
              },
            }}
            to={{
              label: 'You received',
              leg: {
                token: summary.target,
                amount: received,
                usd: outcome.amountOutUsd ?? summary.amountOutUsd,
              },
            }}
          />
        }
        notes={
          <>
            {summary.recipient ? (
              <Notes.Item label="Recipient" value={destination} />
            ) : null}
            <Notes.Item label="Fees" value={summary.fee?.usd} />
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
        signer={{
          name: !summary.source.isIntent && wallet ? wallet.name : account.name,
          isPasskey: summary.source.isIntent && account.kind === 'passkey',
        }}
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
        assets={
          <>
            <InlineAmount amount={summary.amountIn} token={summary.source} /> on{' '}
            <InlineChain chain={summary.source.blockchain} /> for{' '}
            <InlineAmount
              isEstimate
              amount={summary.amountOut}
              token={summary.target}
            />{' '}
            on <InlineChain chain={summary.target.blockchain} />
          </>
        }
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
        description={`Nothing was swapped. Your ${summary.amountIn} ${summary.source.symbol} is refunded to ${summary.source.isIntent ? 'your account' : sourceName}.`}
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
    return (
      <EmptyAccount
        title="Swap"
        account={account}
        source={source}
        sourceName={sourceName}
        onChangeSource={changeSource}
      />
    );
  }

  if (picker !== 'none') {
    return (
      <TokenPicker
        variant={picker}
        chainsFilter={picker === 'source' ? sourceFilter : TARGET_FILTER}
        onSelect={(token) => {
          selectToken(picker, token);
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
  const receivesAtOwn =
    !!ctx.targetToken &&
    sameAddress(
      ctx.sendAddress,
      ownAddress(wallet, ctx.targetToken.blockchain),
    );

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
      <TransferTabs value="swap" />
      <SourceRow account={account} screen="swap" onChange={changeSource} />

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
                  selectToken('source', msg.token);
                  break;
                default:
                  setPicker('source');
              }
            }}
          />
          <DirectionSwitcher
            isEnabled={canFlip}
            isLoading={ctx.quoteStatus === 'pending'}
            onClick={flip}
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
                  selectToken('target', msg.token);
                  break;
                default:
                  setPicker('target');
              }
            }}
          />
        </div>
      )}

      {!sendsOut && onChainTarget && receiver ? (
        <WalletSelector
          label="To"
          ariaLabel="Receive to wallet"
          option={receiver}
          onClick={
            receivers.length > 1 ? () => setIsPickingReceiver(true) : undefined
          }
        />
      ) : null}

      {onChainTarget ? (
        <div className="flex shrink-0 items-center justify-between gap-sw-md rounded-sw-md bg-sw-gray-900 px-sw-xl py-sw-lg">
          <div className="flex flex-col gap-sw-xs">
            <span className="text-sw-label-md text-sw-gray-50">
              Send to another address
            </span>
            <span className="text-sw-label-sm text-sw-gray-300">
              {isSendOutRequired
                ? requiredHint
                : 'Swap and withdraw to a wallet outside this account'}
            </span>
          </div>
          <Toggle
            className="shrink-0"
            isOn={sendsOut}
            isDisabled={isSendOutRequired}
            onToggle={toggleSendsOut}
          />
        </div>
      ) : null}

      {isPickingReceiver && !sendsOut && onChainTarget ? (
        <WalletPicker
          title="Receive to wallet"
          description={`Your wallets on ${onChainTarget.chainName}.`}
          options={receivers}
          selectedId={receiver?.id}
          onSelect={(option) => {
            fireEvent('addressSet', option.address);
            setIsPickingReceiver(false);
          }}
          onClose={() => setIsPickingReceiver(false)}
        />
      ) : null}

      {sendsOut && ctx.targetToken && !ctx.targetToken.isIntent ? (
        <RecipientField
          label={(() => {
            const name = walletNameAt(account, secondaries, ctx.sendAddress);

            if (receivesAtOwn) {
              return `Receive ${ctx.targetToken.symbol} at your spending wallet`;
            }

            return name
              ? `Receive ${ctx.targetToken.symbol} at ${name}`
              : `Receive ${ctx.targetToken.symbol} at`;
          })()}
          target={ctx.targetToken}
          networks={ALL_CHAINS}
          recipients={recipients}
          wrongNetworkHint={(network) =>
            `Pick a token on ${network} or paste a ${ctx.targetToken?.chainName ?? ''} address.`
          }
        />
      ) : null}

      {isInsufficient && ctx.sourceToken ? (
        <Banner
          className="wrap-banner"
          variant="error"
          hasBg
          multiline
          message={`You have ${describeAmount(formatTokenAmount(ctx.sourceTokenBalance, ctx.sourceToken) || '0', ctx.sourceToken)} in ${ctx.sourceToken.isIntent ? 'your account' : sourceName}. Lower the amount or ${ctx.sourceToken.isIntent ? 'deposit more' : 'pick another token'}.`}
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
