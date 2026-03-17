import { useInfiniteQuery } from '@tanstack/react-query';
import { useConfig } from '../config';
import { feeServiceApi } from '../network';
import type {
  FakeTransaction,
  Transaction,
  TransactionsResponse,
  TransactionStatus,
} from '../types/transaction';
import { getTransactionHistoryQueryKey } from '../utils/transactions/getTransactionHistoryQueryKey';
import {
  getOptimisticTransactions,
  removeOptimisticTransaction,
} from '../utils/transactions/addOptimisticTransaction';
import { usePoaDeposits } from './usePoaDeposits';
import { useTokens } from './useTokens';

const PER_PAGE = 7;
const POLLING_INTERVAL_MS = 5_000;
const PENDING_STATUSES: TransactionStatus[] = [
  'PENDING',
  'PROCESSING',
  'WAITING_FOR_FUNDS',
];

export const useTransactions = () => {
  const {
    apiKey,
    connectedWallets: { default: walletAddress },
  } = useConfig();

  const { tokens } = useTokens();

  const queryKey = getTransactionHistoryQueryKey(walletAddress);

  const { data: poaDeposits = [] } = usePoaDeposits(walletAddress, tokens);

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
        (!!walletAddress &&
          getOptimisticTransactions(walletAddress).length > 0);

      return hasPending ? POLLING_INTERVAL_MS : false;
    },
  });

  const apiTransactions = data?.pages.flatMap((page) => page.data.data) ?? [];

  const optimistic = walletAddress
    ? getOptimisticTransactions(walletAddress)
    : [];

  // Remove optimistic entries once the real transaction appears in the API.
  // We check all hash fields because intents withdrawals may track hashes
  // in destinationChainTxHashes or intentHashes rather than originChainTxHashes.
  const apiHashes = new Set(
    apiTransactions
      .flatMap((tx) => [
        ...(tx.originChainTxHashes ?? []),
        ...(tx.destinationChainTxHashes ?? []),
        ...(tx.nearTxHashes ?? []),
        tx.intentHashes,
      ])
      .filter(Boolean),
  );

  optimistic.forEach((tx) => {
    [tx.intentHashes, ...tx.originChainTxHashes]
      .filter((hash): hash is string => !!hash && apiHashes.has(hash))
      .forEach(removeOptimisticTransaction);
  });

  // Filter out POA deposits that already appear in the API results
  const filteredPoaDeposits = poaDeposits.filter((poa) => {
    const poaHashes = poa.originChainTxHashes.filter(Boolean);

    if (poaHashes.length === 0) {
      return true;
    }

    return !poaHashes.some((hash) => apiHashes.has(hash));
  });

  const transactions: (Transaction | FakeTransaction)[] = [
    ...optimistic,
    ...filteredPoaDeposits,
    ...apiTransactions,
  ].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );

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
