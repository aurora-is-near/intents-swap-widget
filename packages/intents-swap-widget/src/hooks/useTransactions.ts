import { useEffect } from 'react';
import { useInfiniteQuery } from '@tanstack/react-query';
import { useConfig } from '../config';
import { feeServiceApi } from '../network';
import type {
  TransactionsResponse,
  TransactionStatus,
} from '../types/transaction';
import { fireEvent, useUnsafeSnapshot } from '../machine';

const PER_PAGE = 7;
const POLLING_INTERVAL_MS = 5_000;
const PENDING_STATUSES: TransactionStatus[] = [
  'PROCESSING',
  'WAITING_FOR_FUNDS',
];

export const TRANSACTIONS_QUERY_KEY = 'transactions';

export const useTransactions = () => {
  const { apiKey } = useConfig();
  const {
    ctx: { walletAddress, pollingTransactionsStartedAt },
  } = useUnsafeSnapshot();

  const {
    data,
    isLoading,
    isError,
    refetch,
    hasNextPage,
    fetchNextPage,
    isFetchingNextPage,
  } = useInfiniteQuery({
    queryKey: [TRANSACTIONS_QUERY_KEY, walletAddress].filter(Boolean),
    queryFn: ({ pageParam }) => {
      if (!apiKey) {
        throw new Error('An API key is required to fetch transactions');
      }

      return feeServiceApi.get<TransactionsResponse>(
        `/api/transactions-pages/${apiKey}`,
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
      const transactions =
        query.state.data?.pages.flatMap((p) => p.data.data) ?? [];

      const hasPending = transactions.some((tx) =>
        PENDING_STATUSES.includes(tx.status),
      );

      const isPolling = pollingTransactionsStartedAt !== null;

      return hasPending || isPolling ? POLLING_INTERVAL_MS : false;
    },
  });

  const transactions = data?.pages.flatMap((page) => page.data.data) ?? [];
  const pendingCount = transactions.filter((tx) =>
    PENDING_STATUSES.includes(tx.status),
  ).length;

  // createdAtTimestamp is in seconds, pollingTransactionsStartedAt is in ms
  const mostRecentTxTimestampMs =
    (transactions[0]?.createdAtTimestamp ?? 0) * 1000;

  useEffect(() => {
    fireEvent('pendingTransactionsCountSet', pendingCount);
  }, [pendingCount]);

  useEffect(() => {
    if (
      pollingTransactionsStartedAt !== null &&
      mostRecentTxTimestampMs >= pollingTransactionsStartedAt
    ) {
      fireEvent('pollingTransactionsSet', null);
    }
  }, [mostRecentTxTimestampMs, pollingTransactionsStartedAt]);

  return {
    transactions,
    isLoading,
    isError,
    refetch,
    hasNextPage,
    fetchNextPage,
    isFetchingNextPage,
  };
};
