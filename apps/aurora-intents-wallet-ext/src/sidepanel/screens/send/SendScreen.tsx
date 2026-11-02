import { useEffect, useMemo, useState } from 'react';

import {
  BlockingError,
  Button,
  fireEvent,
  Notes,
  SubmitButton,
  TokenInput,
  useTokens,
  useUnsafeSnapshot,
} from '@aurora-is-near/intents-swap-widget';
import type { Token } from '@aurora-is-near/intents-swap-widget';
import { formatTxHash } from '@aurora-is-near/intents-swap-widget/utils';

import type { Account } from '../../accounts/types';
import { useAccounts } from '../../accounts/useAccounts';
import { Screen } from '../../components/Screen';
import { useNavigation } from '../../navigation';
import { formatAmount, shortAddress } from '../../utils';
import { InlineAmount, InlineChain } from '../transfer/InlineAsset';
import { RecipientField } from '../transfer/RecipientField';
import { SourceRow } from '../transfer/SourceRow';
import { TransferLegs } from '../transfer/TransferLegs';
import { describeAmount, getTransferSummary } from '../transfer/summary';
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
import { recipientOptions, walletNameAt } from '../transfer/walletOptions';
import { NetworkSelect } from './NetworkSelect';

/** The source asset on every network it exists on, one token per chain. */
const networksOf = (tokens: Token[], source: Token | undefined) => {
  if (!source) {
    return [];
  }

  const chains = new Set<string>();

  return tokens.filter((token) => {
    if (token.isIntent || token.symbol !== source.symbol) {
      return false;
    }

    if (chains.has(token.blockchain)) {
      return false;
    }

    chains.add(token.blockchain);

    return true;
  });
};

/** The recipient field explains these; there's no quote to show. */
const ADDRESS_ERRORS: string[] = [
  'SEND_ADDRESS_IS_INVALID',
  'SEND_ADDRESS_IS_NOT_FOUND',
  'TOKEN_IS_NOT_SUPPORTED',
];

const isSameToken = (a: Token, b: Token) =>
  a.assetId === b.assetId && a.blockchain === b.blockchain;

/**
 * Sends a token — from the account's intents balance or one of its wallets
 * ("From", through 1Click like a swap from the wallet) — to an address, on a
 * network of that asset.
 */
export const SendScreen = ({
  account,
  source: preferredSource,
}: {
  account: Account;
  source?: Token;
}) => {
  const { back, reset } = useNavigation();
  const { ctx } = useUnsafeSnapshot();
  const { secondaries } = useAccounts();
  const { tokens, status: tokensStatus, refetch } = useTokens();
  const {
    onChangeAmount,
    onChangeToken,
    source,
    wallet,
    sourceName,
    sourceFilter,
    changeSource,
    isLoading,
    isEmpty,
  } = useTransferForm({ account, preferredSource });

  const outcome = useTransferOutcome();
  const [isPickerOpen, setIsPickerOpen] = useState(false);

  const networks = useMemo(
    () => networksOf(tokens, ctx.sourceToken),
    [tokens, ctx.sourceToken],
  );

  // Keep the target on the source's asset: its own chain first, as that's
  // where it came from.
  useEffect(() => {
    const target = ctx.targetToken;

    if (target && networks.some((token) => isSameToken(token, target))) {
      return;
    }

    const next =
      networks.find(
        (token) => token.blockchain === ctx.sourceToken?.blockchain,
      ) ?? networks[0];

    if (next) {
      onChangeToken('target', next);
    } else if (target) {
      fireEvent('tokenSelect', { variant: 'target', token: undefined });
    }
  }, [networks, ctx.targetToken, ctx.sourceToken?.blockchain]);

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

  /** The recipient by name when it's one of the account's wallets. */
  const recipientLabel = (address: string) =>
    walletNameAt(account, secondaries, address) ?? shortAddress(address);

  if (tokensStatus === 'error') {
    return (
      <Screen title="Send" onBack={back}>
        <BlockingError
          message="Couldn't load the token list."
          onClickRetry={() => {
            refetch().catch(() => undefined);
          }}
        />
      </Screen>
    );
  }

  if (outcome.view === 'success' && outcome.transfer && summary) {
    const { transfer } = outcome;
    const delivered = outcome.amountOutFormatted
      ? formatAmount(outcome.amountOutFormatted)
      : summary.amountOut;

    return (
      <TransferResultView
        screenTitle="Send"
        tone="success"
        title={`Sent ${summary.amountIn} ${summary.source.symbol}`}
        description={
          summary.recipient
            ? `Delivered to ${recipientLabel(summary.recipient)}.`
            : 'Delivered.'
        }
        details={
          <TransferLegs
            to={{
              label: 'Recipient got',
              leg: {
                token: summary.target,
                amount: delivered,
                usd: outcome.amountOutUsd ?? summary.amountOutUsd,
              },
            }}
          />
        }
        notes={
          <>
            {summary.recipient ? (
              <Notes.Item
                label="To"
                value={recipientLabel(summary.recipient)}
              />
            ) : null}
            <Notes.Item label="Network" value={summary.target.chainName} />
            <Notes.Item label="Network fee" value={summary.fee?.usd} />
            <Notes.Item
              label="Transaction"
              value={
                <a
                  href={transfer.transactionLink}
                  target="_blank"
                  rel="noreferrer"
                  className="text-sw-accent-300 hover:text-sw-accent-200">
                  {formatTxHash(transfer.hash)}
                </a>
              }
            />
          </>
        }
        footer={
          <>
            <Button variant="primary" size="lg" onClick={goHome}>
              Done
            </Button>
            <Button variant="outlined" size="lg" onClick={outcome.again}>
              Send again
            </Button>
          </>
        }
        onBack={outcome.again}
      />
    );
  }

  const noteRows = summary ? (
    <>
      {summary.recipient ? (
        <Notes.Item label="To" value={recipientLabel(summary.recipient)} />
      ) : null}
      <Notes.Item
        label="Recipient gets"
        value={`≈ ${describeAmount(summary.amountOut, summary.target)}`}
      />
      <Notes.Item label="Network fee" value={summary.fee?.usd} />
    </>
  ) : null;

  if ((outcome.view === 'pending' || outcome.view === 'settling') && summary) {
    return (
      <TransferPending
        signer={{
          name: !summary.source.isIntent && wallet ? wallet.name : account.name,
          isPasskey: summary.source.isIntent && account.kind === 'passkey',
        }}
        screenTitle="Send"
        title={`Sending ${summary.amountIn} ${summary.source.symbol} to ${summary.target.chainName}`}
        isSigned={outcome.isSigned}
        isFromWallet={!summary.source.isIntent}
        steps={[
          `Sending on ${summary.target.chainName}`,
          'Delivered to the recipient',
        ]}
        assets={
          <>
            <InlineAmount amount={summary.amountIn} token={summary.source} /> to{' '}
            {summary.recipient
              ? recipientLabel(summary.recipient)
              : 'the recipient'}{' '}
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
        screenTitle="Send"
        tone="error"
        title="Send wasn’t completed"
        description={`Nothing was sent. Your ${summary.amountIn} ${summary.source.symbol} is refunded to ${summary.source.isIntent ? 'your account' : sourceName}.`}
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
        screenTitle="Send"
        tone="error"
        title="Send failed"
        description={
          outcome.errorMessage ??
          'The transfer couldn’t be completed. Try again.'
        }
        notes={noteRows}
        footer={
          <>
            <Button variant="primary" size="lg" onClick={outcome.retry}>
              Try again
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
        title="Send"
        account={account}
        source={source}
        sourceName={sourceName}
        onChangeSource={changeSource}
      />
    );
  }

  if (isPickerOpen) {
    return (
      <TokenPicker
        variant="source"
        chainsFilter={sourceFilter}
        onSelect={(token) => {
          onChangeToken('source', token);
          setIsPickerOpen(false);
        }}
        onClose={() => setIsPickerOpen(false)}
      />
    );
  }

  const isQuoting = ctx.quoteStatus === 'pending' && !ctx.quote;
  const isAddressRejected = ADDRESS_ERRORS.includes(ctx.error?.code ?? '');

  return (
    <Screen
      title="Send"
      onBack={back}
      className="gap-sw-md"
      footer={<SubmitButton label="Send" onSuccess={outcome.onSuccess} />}>
      <TransferTabs value="send" />
      <SourceRow account={account} screen="send" onChange={changeSource} />

      {tokensStatus === 'pending' || isLoading ? (
        <TokenInput.Skeleton />
      ) : (
        <TokenInput.Source
          heading="You send"
          onMsg={(msg) => {
            switch (msg.type) {
              case 'on_change_amount':
                onChangeAmount('source', msg.amount);
                break;
              case 'on_select_token':
                onChangeToken('source', msg.token);
                break;
              default:
                setIsPickerOpen(true);
            }
          }}
        />
      )}

      {ctx.targetToken && !ctx.targetToken.isIntent ? (
        <RecipientField
          label={(() => {
            const name = walletNameAt(account, secondaries, ctx.sendAddress);

            return name ? `Recipient address · ${name}` : 'Recipient address';
          })()}
          target={ctx.targetToken}
          networks={networks.map((token) => token.blockchain)}
          recipients={recipients}
          wrongNetworkHint={(network) =>
            `Switch the network to ${network} or paste a ${ctx.targetToken?.chainName ?? ''} address.`
          }
        />
      ) : null}

      <NetworkSelect
        options={networks}
        selected={ctx.targetToken}
        onSelect={(token) => onChangeToken('target', token)}
      />

      {summary &&
      ctx.sourceTokenAmount &&
      ctx.sendAddress &&
      !isAddressRejected ? (
        <NotesCard>
          <Notes.Item
            label="Recipient gets"
            value={describeAmount(summary.amountOut, summary.target)}
            isLoading={isQuoting}
          />
          <Notes.Item
            label="Network fee"
            value={summary.fee?.usd}
            isLoading={isQuoting}
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
