import {
  Button,
  CopyButton,
  Notes,
  useTokens,
} from '@aurora-is-near/intents-swap-widget';
import type { Token } from '@aurora-is-near/intents-swap-widget';
import { formatUsdAmount } from '@aurora-is-near/intents-swap-widget/utils';

import type { ActivityTransaction } from '../../activity/activity';
import {
  explorerLink,
  KIND_LABELS,
  toActivityItem,
} from '../../activity/activity';
import { ActivityStatusBadge } from '../../activity/ActivityCard';
import { useActivity } from '../../activity/useActivity';
import { Icon } from '../../components/Icon';
import { Screen } from '../../components/Screen';
import { TokenWithChain } from '../../components/TokenWithChain';
import { useNavigation } from '../../navigation';
import { shortAddress } from '../../utils';
import { chainLabel } from '../transfer/summary';
import { NotesCard } from '../transfer/TransferStatus';

const Amount = ({
  token,
  amount,
  isEstimate,
}: {
  token: Token | undefined;
  amount: string;
  isEstimate?: boolean;
}) => (
  <div className="flex items-center gap-sw-lg">
    {token ? <TokenWithChain token={token} /> : null}
    <div className="flex min-w-[0px] flex-col gap-sw-xs">
      <span className="truncate text-sw-h5 text-sw-gray-50">
        {isEstimate ? '≈ ' : ''}
        {amount || '—'} {token?.symbol ?? ''}
      </span>
      {token ? (
        <span className="text-sw-label-sm text-sw-gray-300">
          on {chainLabel(token.blockchain)}
          {token.isIntent ? ' · in your account' : ''}
        </span>
      ) : null}
    </div>
  </div>
);

const Copyable = ({ value }: { value: string }) => (
  <span className="flex items-center gap-sw-sm">
    {shortAddress(value)}
    <CopyButton value={value} />
  </span>
);

const formatCreated = (date: Date) =>
  date.toLocaleString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

/** One swap, deposit or send: amounts, status and where to trace it. */
export const ActivityDetailScreen = ({
  transaction,
}: {
  transaction: ActivityTransaction;
}) => {
  const { back } = useNavigation();
  const { tokens } = useTokens();
  const activity = useActivity();

  // The live entry, so a pending one updates here too.
  const opened = toActivityItem(tokens, transaction);
  const item = activity.items.find((entry) => entry.id === opened.id) ?? opened;
  const tx = item.transaction;
  const link = explorerLink(tx);

  const inUsd = Number(tx.amountInUsd);
  const outUsd = Number(tx.amountOutUsd);
  // Nothing is charged when it isn't filled.
  const isUnfilled = item.status === 'failed' || item.status === 'refunded';
  const fee =
    !isUnfilled &&
    Number.isFinite(inUsd) &&
    Number.isFinite(outUsd) &&
    inUsd > 0
      ? formatUsdAmount(Math.max(0, inUsd - outUsd))
      : undefined;

  const intentHash = 'intentHashes' in tx ? tx.intentHashes : undefined;
  const refundReason = 'refundReason' in tx ? tx.refundReason : null;

  return (
    <Screen
      title={`${KIND_LABELS[item.kind]} details`}
      onBack={back}
      footer={
        link ? (
          <Button
            variant="outlined"
            size="lg"
            onClick={() => window.open(link, '_blank', 'noopener')}>
            View on NEAR Intents explorer
          </Button>
        ) : null
      }>
      <div className="flex shrink-0 flex-col gap-sw-md rounded-sw-lg bg-sw-gray-900 p-sw-2xl">
        <div className="flex items-center justify-between">
          <span className="text-sw-label-md text-sw-gray-200">
            {KIND_LABELS[item.kind]}
          </span>
          <ActivityStatusBadge status={item.status} />
        </div>
        <div className="mt-sw-md flex flex-col gap-sw-md">
          <Amount token={item.from.token} amount={item.from.amount} />
          <span className="flex w-[40px] justify-center text-sw-gray-400">
            <Icon name="arrowDown" size={18} />
          </span>
          <Amount
            token={item.to.token}
            amount={item.to.amount}
            // Only a filled transfer delivered this amount.
            isEstimate={item.status !== 'success'}
          />
        </div>
      </div>

      <NotesCard>
        {fee ? <Notes.Item label="Fees" value={fee} /> : null}
        {item.recipient ? (
          <Notes.Item
            label="Recipient"
            value={<Copyable value={item.recipient} />}
          />
        ) : null}
        {item.status === 'refunded' && tx.refundTo ? (
          <Notes.Item
            label="Refunded to"
            value={<Copyable value={tx.refundTo} />}
          />
        ) : null}
        {refundReason ? (
          <Notes.Item label="Refund reason" value={refundReason} />
        ) : null}
        {intentHash ? (
          <Notes.Item
            label="Intent hash"
            value={<Copyable value={intentHash} />}
          />
        ) : null}
        {tx.depositAddress ? (
          <Notes.Item
            label="Deposit address"
            value={<Copyable value={tx.depositAddress} />}
          />
        ) : null}
        <Notes.Item label="Created" value={formatCreated(item.createdAt)} />
      </NotesCard>
    </Screen>
  );
};
