import type { FakeTransaction, Transaction } from '../../types/transaction';
import { formatAddressTruncate } from '../formatters/formatAddressTruncate';

export const getTransactionType = (
  tx: Transaction | FakeTransaction,
): string => {
  if ('isPoaDeposit' in tx && tx.isPoaDeposit && tx.senders.length > 0) {
    const sender = formatAddressTruncate(tx.senders[0] ?? '', 10);

    return `Deposit from ${sender}`;
  }

  return 'Swap';
};
