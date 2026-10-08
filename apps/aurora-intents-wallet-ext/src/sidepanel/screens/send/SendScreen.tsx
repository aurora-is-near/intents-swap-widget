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
import type { ChainsFilter, Token } from '@aurora-is-near/intents-swap-widget';
import { formatTxHash } from '@aurora-is-near/intents-swap-widget/utils';

import type { Account } from '../../accounts/types';
import { Screen } from '../../components/Screen';
import { useNavigation } from '../../navigation';
import { shortAddress } from '../../utils';
import { RecipientField } from '../transfer/RecipientField';
import { describeAmount, getTransferSummary } from '../transfer/summary';
import { TokenPicker } from '../transfer/TokenPicker';
import {
  NotesCard,
  TransferPending,
  TransferResultView,
} from '../transfer/TransferStatus';
import { EmptyAccount } from '../transfer/EmptyAccount';
import { useTransferForm } from '../transfer/useTransferForm';
import { useTransferOutcome } from '../transfer/useTransferOutcome';
import { NetworkSelect } from './NetworkSelect';

/** Sends spend the account's intents balance. */
const SOURCE_FILTER: ChainsFilter = {
  intents: 'with-balance',
  external: 'none',
};

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

/** Withdraws an intents token to an address, on a network of that asset. */
export const SendScreen = ({ account }: { account: Account }) => {
  const { back, reset } = useNavigation();
  const { ctx } = useUnsafeSnapshot();
  const { tokens, status: tokensStatus, refetch } = useTokens();
  const { onChangeAmount, onChangeToken, isLoading, isEmpty } =
    useTransferForm();

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

  if (outcome.view === 'success' && outcome.outcome && summary) {
    const { transfer } = outcome.outcome;

    return (
      <TransferResultView
        screenTitle="Send"
        tone="success"
        title={`Sent ${summary.amountIn} ${summary.source.symbol}`}
        description={`The recipient got ${describeAmount(summary.amountOut, summary.target)}.`}
        notes={
          <>
            {summary.recipient ? (
              <Notes.Item label="To" value={shortAddress(summary.recipient)} />
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
        <Notes.Item label="To" value={shortAddress(summary.recipient)} />
      ) : null}
      <Notes.Item
        label="Recipient gets"
        value={`≈ ${describeAmount(summary.amountOut, summary.target)}`}
      />
      <Notes.Item label="Network fee" value={summary.fee?.usd} />
    </>
  ) : null;

  if (outcome.view === 'pending' && summary) {
    return (
      <TransferPending
        account={account}
        screenTitle="Send"
        title={`Sending ${summary.amountIn} ${summary.source.symbol} to ${summary.target.chainName}`}
        isSigned={outcome.isSigned}
        steps={[
          `Sending on ${summary.target.chainName}`,
          'Delivered to the recipient',
        ]}
        notes={noteRows}
        onBack={goHome}
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
    return <EmptyAccount title="Send" account={account} />;
  }

  if (isPickerOpen) {
    return (
      <TokenPicker
        variant="source"
        chainsFilter={SOURCE_FILTER}
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

      <NetworkSelect
        options={networks}
        selected={ctx.targetToken}
        onSelect={(token) => onChangeToken('target', token)}
      />

      {ctx.targetToken && !ctx.targetToken.isIntent ? (
        <RecipientField
          label="Recipient address"
          account={account}
          target={ctx.targetToken}
          networks={networks.map((token) => token.blockchain)}
          wrongNetworkHint={(network) =>
            `Switch the network to ${network} or paste a ${ctx.targetToken?.chainName ?? ''} address.`
          }
        />
      ) : null}

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
