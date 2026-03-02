import { useInfiniteQuery } from '@tanstack/react-query';
import { useConfig } from '../config';
import { feeServiceApi } from '../network';
import type { TransactionsResponse } from '../types/transaction';

const PER_PAGE = 7;

export const useTransactions = () => {
  const { apiKey } = useConfig();

  const { data, isLoading, hasNextPage, fetchNextPage, isFetchingNextPage } =
    useInfiniteQuery({
      queryKey: ['transactions'],
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
            },
          },
        );
      },
      getNextPageParam: (lastPage) => lastPage.data.nextPage,
      initialPageParam: 1,
    });

  return {
    transactions: data?.pages.flatMap((page) => page.data.data) ?? [],
    isLoading,
    hasNextPage,
    fetchNextPage,
    isFetchingNextPage,
  };
};
