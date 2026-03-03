import { useInfiniteQuery } from '@tanstack/react-query';
import { useConfig } from '../config';
import { feeServiceApi } from '../network';
import type {
  TransactionsResponse,
  TransactionStatus,
} from '../types/transaction';
import { useUnsafeSnapshot } from '../machine';

const PER_PAGE = 7;
const POLLING_INTERVAL_MS = 10_000;
const PENDING_STATUSES: TransactionStatus[] = [
  'PROCESSING',
  'WAITING_FOR_FUNDS',
];

export const useTransactions = () => {
  const { apiKey } = useConfig();
  const {
    ctx: { walletAddress },
  } = useUnsafeSnapshot();

  const { data, isLoading, hasNextPage, fetchNextPage, isFetchingNextPage } =
    useInfiniteQuery({
      queryKey: ['transactions', walletAddress].filter(Boolean),
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
      getNextPageParam: (lastPage) => lastPage.data.nextPage,
      initialPageParam: 1,
      refetchInterval: (query) => {
        const transactions =
          query.state.data?.pages.flatMap((p) => p.data.data) ?? [];

        const hasPending = transactions.some((tx) =>
          PENDING_STATUSES.includes(tx.status),
        );

        return hasPending ? POLLING_INTERVAL_MS : false;
      },
    });

  return {
    transactions: data?.pages.flatMap((page) => page.data.data) ?? [],
    isLoading,
    hasNextPage,
    fetchNextPage,
    isFetchingNextPage,
  };
};
