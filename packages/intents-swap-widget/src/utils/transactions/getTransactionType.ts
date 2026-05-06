import type {
  FakeTransaction,
  Transaction,
  TransactionType,
} from '../../types/transaction';

export const getTransactionType = (
  tx: Transaction | FakeTransaction,
): TransactionType => {
  if ('isPoaDeposit' in tx && tx.isPoaDeposit && tx.senders.length > 0) {
    return 'DEPOSIT';
  }

  return 'SWAP';
};
