import type { Transaction } from '../../types/transaction';
import type { Token } from '../../types/token';
import { formatAddressTruncate } from '../formatters/formatAddressTruncate';

export const getTransactionType = (
  tx: Transaction,
  tokens?: Token[],
): string => {
  const originToken = tokens?.find((t) => t.assetId === tx.originAsset);
  const destToken = tokens?.find((t) => t.assetId === tx.destinationAsset);

  if (!tx.senders.length && tx.recipient) {
    const recipient = formatAddressTruncate(tx.recipient, 10);

    return `Withdrawal to ${recipient}`;
  }

  if (
    originToken &&
    destToken &&
    originToken.assetId !== destToken.assetId &&
    originToken.symbol === destToken.symbol &&
    tx.senders.length > 0
  ) {
    const sender = formatAddressTruncate(tx.senders[0] ?? '', 10);

    return `Deposit from ${sender}`;
  }

  return 'Swap';
};
