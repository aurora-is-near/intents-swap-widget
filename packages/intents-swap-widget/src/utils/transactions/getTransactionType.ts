import type { FakeTransaction, Transaction } from '../../types/transaction';

export const getTransactionType = (tx: Transaction | FakeTransaction) => {
  if ('isPoaDeposit' in tx && tx.isPoaDeposit && tx.senders.length > 0) {
    return 'DEPOSIT' as const;
  }

  return 'SWAP' as const;
};
