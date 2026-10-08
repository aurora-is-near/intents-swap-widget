import type {
  FakeTransaction,
  Token,
  Transaction,
} from '@aurora-is-near/intents-swap-widget';
import { findTransactionToken } from '@aurora-is-near/intents-swap-widget/utils';

import { formatAmount } from '../utils';

export type ActivityTransaction = Transaction | FakeTransaction;

export type ActivityKind = 'swap' | 'deposit' | 'send';

export type ActivityStatus = 'pending' | 'success' | 'failed' | 'refunded';

export type ActivityItem = {
  /** Stable per transaction: its deposit address, else its first hash. */
  id: string;
  kind: ActivityKind;
  status: ActivityStatus;
  createdAt: Date;
  from: { token: Token | undefined; amount: string };
  to: { token: Token | undefined; amount: string };
  /** Where an external payout went; undefined when it stayed in the account. */
  recipient: string | undefined;
  transaction: ActivityTransaction;
};

const STATUS: Record<ActivityTransaction['status'], ActivityStatus> = {
  SUCCESS: 'success',
  FAILED: 'failed',
  REFUNDED: 'refunded',
  PENDING: 'pending',
  PROCESSING: 'pending',
  WAITING_FOR_FUNDS: 'pending',
  UNRESOLVED: 'pending',
};

/**
 * What a 1Click transaction was for this account:
 * - deposit: into the account, from a deposit address (any-amount quotes) or
 *   the same token from the wallet;
 * - send: the same token out to an address;
 * - swap: anything else.
 */
const kindOf = (
  tx: ActivityTransaction,
  from: Token | undefined,
  to: Token | undefined,
): ActivityKind => {
  const isSameAsset = !!from && !!to && from.symbol === to.symbol;
  const swapType = 'swapType' in tx ? tx.swapType : undefined;

  if (String(swapType) === 'ANY_INPUT') {
    return 'deposit';
  }

  if (tx.recipientType === 'INTENTS') {
    return tx.depositType === 'ORIGIN_CHAIN' && isSameAsset
      ? 'deposit'
      : 'swap';
  }

  return isSameAsset ? 'send' : 'swap';
};

export const toActivityItem = (
  tokens: Token[],
  tx: ActivityTransaction,
): ActivityItem => {
  const from = findTransactionToken(tokens, tx, 'source');
  const to = findTransactionToken(tokens, tx, 'destination');

  return {
    id:
      tx.depositAddress ??
      tx.intentHashes ??
      tx.originChainTxHashes[0] ??
      `${tx.createdAt}-${tx.originAsset}`,
    kind: kindOf(tx, from, to),
    status: STATUS[tx.status],
    createdAt: new Date(tx.createdAt),
    from: { token: from, amount: formatAmount(tx.amountInFormatted) },
    to: { token: to, amount: formatAmount(tx.amountOutFormatted) },
    recipient:
      tx.recipientType === 'DESTINATION_CHAIN' ? tx.recipient : undefined,
    transaction: tx,
  };
};

export const KIND_LABELS: Record<ActivityKind, string> = {
  swap: 'Swap',
  deposit: 'Deposit',
  send: 'Send',
};

/** Whether the item moved this token in or out. */
export const involvesToken = (item: ActivityItem, token: Token) =>
  [item.from.token, item.to.token].some(
    (side) =>
      !!side &&
      side.assetId === token.assetId &&
      side.isIntent === token.isIntent &&
      side.blockchain === token.blockchain,
  );

const sameDay = (a: Date, b: Date) =>
  a.getFullYear() === b.getFullYear() &&
  a.getMonth() === b.getMonth() &&
  a.getDate() === b.getDate();

/** "Today", "Yesterday", "28 Sep", "28 Sep 2025". */
const dayLabel = (date: Date, now = new Date()) => {
  const yesterday = new Date(now);

  yesterday.setDate(now.getDate() - 1);

  if (sameDay(date, now)) {
    return 'Today';
  }

  if (sameDay(date, yesterday)) {
    return 'Yesterday';
  }

  // "28 Sep" (en-GB's short month is "Sept").
  const month = date.toLocaleDateString('en-US', { month: 'short' });
  const year =
    date.getFullYear() === now.getFullYear() ? '' : ` ${date.getFullYear()}`;

  return `${date.getDate()} ${month}${year}`;
};

/** "Just now", "42 min ago", "3 h ago" today; "18:42" on earlier days. */
export const timeLabel = (date: Date, now = new Date()) => {
  const minutes = Math.floor((now.getTime() - date.getTime()) / 60_000);

  if (!sameDay(date, now)) {
    return date.toLocaleTimeString('en-GB', {
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  if (minutes < 1) {
    return 'Just now';
  }

  return minutes < 60
    ? `${minutes} min ago`
    : `${Math.floor(minutes / 60)} h ago`;
};

/** Items in day groups, newest first. */
export const groupByDay = (items: ActivityItem[]) =>
  items.reduce<Array<{ label: string; items: ActivityItem[] }>>(
    (groups, item) => {
      const label = dayLabel(item.createdAt);
      const last = groups[groups.length - 1];

      if (last?.label === label) {
        last.items.push(item);
      } else {
        groups.push({ label, items: [item] });
      }

      return groups;
    },
    [],
  );

export const explorerLink = (tx: ActivityTransaction) =>
  tx.depositAddress
    ? `https://explorer.near-intents.org/transactions/${tx.depositAddress}`
    : undefined;
