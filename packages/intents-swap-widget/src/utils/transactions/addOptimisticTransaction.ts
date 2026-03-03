import type { FakeTransaction } from '../../types/transaction';

const optimisticTransactions = new Map<string, FakeTransaction>();

export const addOptimisticTransaction = (
  txHash: string,
  tx: FakeTransaction,
) => {
  optimisticTransactions.set(txHash, tx);
};

export const getOptimisticTransactions = (): FakeTransaction[] => [
  ...optimisticTransactions.values(),
];

export const removeOptimisticTransaction = (txHash: string) => {
  optimisticTransactions.delete(txHash);
};
