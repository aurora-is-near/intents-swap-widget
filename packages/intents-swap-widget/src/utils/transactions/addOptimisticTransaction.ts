import type { FakeTransaction } from '../../types/transaction';

const optimisticTransactions = new Map<string, FakeTransaction>();

export const addOptimisticTransaction = (
  txHash: string,
  tx: FakeTransaction,
) => {
  optimisticTransactions.set(txHash, tx);
};

export const getOptimisticTransactions = (
  walletAddress?: string,
): FakeTransaction[] => {
  const allTransactions = [...optimisticTransactions.values()];

  return allTransactions.filter(
    (tx) => !walletAddress || tx.senders.includes(walletAddress),
  );
};

export const removeOptimisticTransaction = (txHash: string) => {
  optimisticTransactions.delete(txHash);
};
