import type { FakeTransaction, Transaction } from '../../types/transaction';
import type { Token } from '../../types/token';
import { formatAddressTruncate } from '../formatters/formatAddressTruncate';

export const getTransactionType = (
  tx: Transaction | FakeTransaction,
  tokens?: Token[],
): string => {
  const originToken = tokens?.find((t) => t.assetId === tx.originAsset);
  const destToken = tokens?.find((t) => t.assetId === tx.destinationAsset);

  if (
    !tx.senders.length &&
    tx.recipient &&
    originToken?.isIntent &&
    !destToken?.isIntent
  ) {
    const recipient = formatAddressTruncate(tx.recipient, 10);

    return `Withdrawal to ${recipient}`;
  }

  if (!originToken?.isIntent && destToken?.isIntent && tx.senders.length > 0) {
    const sender = formatAddressTruncate(tx.senders[0] ?? '', 10);

    return `Deposit from ${sender}`;
  }

  // POA deposits: same asset on origin and destination with a sender
  if (
    tx.originAsset === tx.destinationAsset &&
    tx.senders.length > 0 &&
    originToken
  ) {
    const sender = formatAddressTruncate(tx.senders[0] ?? '', 10);

    return `Deposit from ${sender}`;
  }

  return 'Swap';
};
