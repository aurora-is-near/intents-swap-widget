import type { FakeTransaction } from '../../types/transaction';

const optimisticTransactions = new Map<string, FakeTransaction>();

export const addOptimisticTransaction = (
  txHash: string,
  tx: FakeTransaction,
) => {
  optimisticTransactions.set(txHash, tx);
};

export const getOptimisticTransactions = (
  walletAddress: string,
): FakeTransaction[] => {
  const allTransactions = [...optimisticTransactions.values()];

  const walletTransactions = allTransactions.filter((tx) =>
    tx.senders.includes(walletAddress),
  );

  return walletTransactions.sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );
};

export const removeOptimisticTransaction = (txHash: string) => {
  optimisticTransactions.delete(txHash);
};
