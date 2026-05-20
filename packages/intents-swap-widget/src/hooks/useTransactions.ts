import { useInfiniteQuery } from '@tanstack/react-query';

import { useConfig } from '../config';
import { feeServiceApi } from '../network';
import { getTransactionHistoryQueryKey } from '../utils/transactions/getTransactionHistoryQueryKey';
import { getTransactionHashes } from '../utils/transactions/getTransactionHashes';
import {
  getOptimisticTransactions,
  removeOptimisticTransaction,
} from '../utils/transactions/addOptimisticTransaction';
import type {
  FakeTransaction,
  Transaction,
  TransactionsResponse,
  TransactionStatus,
} from '../types/transaction';

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
  // We also match on depositAddress because Aurora-source 1Click flows record
  // no overlapping hashes between the optimistic (Aurora EVM tx hash) and the
  // API record (intent hash + NEAR-side tx hashes) — the 1Click depositAddress
  // is the only stable identifier shared by both.
  const apiHashes = new Set(apiTransactions.flatMap(getTransactionHashes));
  const apiDepositAddresses = new Set(
    apiTransactions.map((tx) => tx.depositAddress).filter(Boolean),
  );

  optimistic.forEach((tx) => {
    const hashMatch = getTransactionHashes(tx).some((hash) =>
      apiHashes.has(hash),
    );

    const depositAddressMatch =
      !!tx.depositAddress && apiDepositAddresses.has(tx.depositAddress);

    if (hashMatch || depositAddressMatch) {
      const key = tx.intentHashes ?? tx.originChainTxHashes[0];

      if (key) {
        removeOptimisticTransaction(key);
      }
    }
  });

  const transactions: (Transaction | FakeTransaction)[] = [
    ...optimistic,
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
