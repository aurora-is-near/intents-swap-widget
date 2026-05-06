import { useTransactions } from '@/hooks';
import { getTransactionHashes } from '@/utils/transactions/getTransactionHashes';
import type { TransactionStatus } from '@/types/transaction';
import type { TransferResult } from '@/types/transfer';

/**
 * Resolves a live status for a transfer.
 */
export const useTransferResultStatus = (
  transferResult: Pick<TransferResult, 'hash' | 'intent'>,
): TransactionStatus => {
  const { transactions } = useTransactions();
  const { hash, intent } = transferResult;

  const match = transactions.find((tx) => {
    const hashes = getTransactionHashes(tx);

    return (
      (!!intent && hashes.includes(intent)) || (!!hash && hashes.includes(hash))
    );
  });

  // Fall back to success if we cannot resolve a matching transaction
  return match?.status ?? 'SUCCESS';
};
