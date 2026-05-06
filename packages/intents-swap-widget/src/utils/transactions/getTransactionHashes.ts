import type { FakeTransaction, Transaction } from '@/types/transaction';

export const getTransactionHashes = (
  tx: Transaction | FakeTransaction,
): string[] => {
  return [
    ...(tx.originChainTxHashes ?? []),
    ...(('destinationChainTxHashes' in tx
      ? tx.destinationChainTxHashes
      : undefined) ?? []),
    ...(('nearTxHashes' in tx ? tx.nearTxHashes : undefined) ?? []),
    tx.intentHashes,
  ].filter((hash): hash is string => !!hash);
};
