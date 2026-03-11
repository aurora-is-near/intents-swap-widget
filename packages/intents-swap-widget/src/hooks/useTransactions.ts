import { useInfiniteQuery } from '@tanstack/react-query';
import { useConfig } from '../config';
import { feeServiceApi } from '../network';
import type {
  FakeTransaction,
  Transaction,
  TransactionsResponse,
  TransactionStatus,
} from '../types/transaction';
import { useUnsafeSnapshot } from '../machine';
import { getTransactionHistoryQueryKey } from '../utils/transactions/getTransactionHistoryQueryKey';
import {
  getOptimisticTransactions,
  removeOptimisticTransaction,
} from '../utils/transactions/addOptimisticTransaction';

const PER_PAGE = 7;
const POLLING_INTERVAL_MS = 5_000;
const PENDING_STATUSES: TransactionStatus[] = [
  'PENDING',
  'PROCESSING',
  'WAITING_FOR_FUNDS',
];

export const useTransactions = () => {
  const { apiKey } = useConfig();
  const {
    ctx: { walletAddress },
  } = useUnsafeSnapshot();

  const queryKey = getTransactionHistoryQueryKey(walletAddress);

  const {
    data,
    isLoading,
    isError,
    refetch,
    hasNextPage,
    fetchNextPage,
    isFetchingNextPage,
    isFetchNextPageError,
  } = useInfiniteQuery({
    queryKey,
    queryFn: ({ pageParam }) => {
      if (!apiKey) {
        throw new Error('An API key is required to fetch transactions');
      }

      return feeServiceApi.get<TransactionsResponse>(
        `/api/transactions/${apiKey}`,
        {
          params: {
            page: pageParam,
            perPage: PER_PAGE,
            walletAddress,
          },
        },
      );
    },
    enabled: !!apiKey && !!walletAddress,
    getNextPageParam: (lastPage) => lastPage.data.nextPage,
    initialPageParam: 1,
    refetchInterval: (query) => {
      const apiTxs = query.state.data?.pages.flatMap((p) => p.data.data) ?? [];

      const hasPending =
        apiTxs.some((tx) => PENDING_STATUSES.includes(tx.status)) ||
        getOptimisticTransactions(walletAddress).length > 0;

      return hasPending ? POLLING_INTERVAL_MS : false;
    },
  });

  const apiTransactions = data?.pages.flatMap((page) => page.data.data) ?? [];
  const optimistic = getOptimisticTransactions(walletAddress);

  // Remove optimistic entries once the real transaction appears in the API.
  // The optimistic intentHashes (origin chain tx hash) appears in the real
  // transaction's originChainTxHashes array.
  const apiOriginHashes = new Set(
    apiTransactions.flatMap((tx) => tx.originChainTxHashes ?? []),
  );

  optimistic.forEach((tx) => {
    const hash = tx.originChainTxHashes.find((h) => apiOriginHashes.has(h));

    if (hash) {
      removeOptimisticTransaction(hash);
    }
  });

  const transactions: (Transaction | FakeTransaction)[] = [
    ...optimistic,
    ...apiTransactions,
  ];

  const pendingTransactionsCount = transactions.filter((tx) =>
    PENDING_STATUSES.includes(tx.status),
  ).length;

  return {
    transactions,
    pendingTransactionsCount,
    isLoading,
    isError,
    refetch,
    hasNextPage,
    fetchNextPage,
    isFetchingNextPage,
    isFetchNextPageError,
  };
};
