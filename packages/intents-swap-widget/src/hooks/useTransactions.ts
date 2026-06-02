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

const PAGE_SIZE = 10;
const POLLING_INTERVAL_MS = 5_000;
const PENDING_STATUSES: TransactionStatus[] = [
  'PENDING',
  'PROCESSING',
  'WAITING_FOR_FUNDS',
];

// Cursor onto the next page, built from the last transaction we have.
type Cursor = {
  lastDepositAddress: string;
  lastDepositMemo?: string;
};

export const useTransactions = () => {
  const {
    apiKey,
    connectedWallets: { default: walletAddress },
  } = useConfig();

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
    queryKey: getTransactionHistoryQueryKey(walletAddress),
    queryFn: ({ pageParam }) => {
      if (!apiKey) {
        throw new Error('An API key is required to fetch transactions');
      }

      return feeServiceApi.get<TransactionsResponse>(
        `/api/transactions/${apiKey}`,
        {
          params: {
            numberOfTransactions: PAGE_SIZE,
            walletAddress,
            lastDepositAddress: pageParam?.lastDepositAddress,
            lastDepositMemo: pageParam?.lastDepositMemo,
          },
        },
      );
    },
    initialPageParam: undefined as Cursor | undefined,
    // A full page means there may be older transactions; page from the last one.
    getNextPageParam: (lastPage) => {
      const txs = lastPage.data;
      const last = txs[txs.length - 1];

      if (txs.length < PAGE_SIZE || !last) {
        return undefined;
      }

      return {
        lastDepositAddress: last.depositAddress,
        lastDepositMemo: last.depositMemo ?? undefined,
      };
    },
    enabled: !!apiKey && !!walletAddress,
    refetchInterval: (query) => {
      const apiTxs = query.state.data?.pages.flatMap((page) => page.data) ?? [];

      const hasPending =
        apiTxs.some((tx) => PENDING_STATUSES.includes(tx.status)) ||
        (!!walletAddress &&
          getOptimisticTransactions(walletAddress).length > 0);

      return hasPending ? POLLING_INTERVAL_MS : false;
    },
  });

  const apiTransactions = data?.pages.flatMap((page) => page.data) ?? [];

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
