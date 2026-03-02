import type { Transaction } from '../../types/transaction';
import { formatAddressTruncate } from '../formatters/formatAddressTruncate';

export const getTransactionType = (tx: Transaction): string => {
  const hasOrigin = !!tx.originAsset;
  const hasDestination = !!tx.destinationAsset;

  if (hasOrigin && hasDestination && tx.originAsset !== tx.destinationAsset) {
    return 'Swap';
  }

  if (hasOrigin && tx.senders.length > 0) {
    const sender = formatAddressTruncate(tx.senders[0] ?? '', 10);

    return `Deposit from ${sender}`;
  }

  if (hasDestination && tx.recipient) {
    const recipient = formatAddressTruncate(tx.recipient, 10);

    return `Withdraw to ${recipient}`;
  }

  if (hasOrigin && hasDestination) {
    return 'Transfer';
  }

  return 'Transaction';
};
