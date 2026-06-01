import { useRef, useState } from 'react';
import { keepPreviousData, useQuery } from '@tanstack/react-query';

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

// Fetch one more than we show to signal "has more".
const INITIAL_VISIBLE_TRANSACTIONS = 9;
const INITIAL_NUMBER_OF_TRANSACTIONS = INITIAL_VISIBLE_TRANSACTIONS + 1;

const MAX_NUMBER_OF_TRANSACTIONS = 1000;
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

  // The explorer endpoint is not paginated: it returns the N most recent
  // transactions. "Show more" re-requests the full set (up to the API max)
  // rather than fetching an additional page.
  const [showAll, setShowAll] = useState(false);
  const numberOfTransactions = showAll
    ? MAX_NUMBER_OF_TRANSACTIONS
    : INITIAL_NUMBER_OF_TRANSACTIONS;

  const queryKey = [
    ...getTransactionHistoryQueryKey(walletAddress),
    numberOfTransactions,
  ];

  const { data, isLoading, isError, isFetching, isPlaceholderData, refetch } =
    useQuery({
      queryKey,
      queryFn: () => {
        if (!apiKey) {
          throw new Error('An API key is required to fetch transactions');
        }

        return feeServiceApi.get<TransactionsResponse>(
          `/api/transactions/${apiKey}`,
          {
            params: {
              numberOfTransactions,
              walletAddress,
            },
          },
        );
      },
      enabled: !!apiKey && !!walletAddress,
      // Keep the current list visible while the larger "Show more" request is
      // in flight instead of flashing the loading skeleton.
      placeholderData: keepPreviousData,
      refetchInterval: (query) => {
        const apiTxs = query.state.data?.data ?? [];

        const hasPending =
          apiTxs.some((tx) => PENDING_STATUSES.includes(tx.status)) ||
          (!!walletAddress &&
            getOptimisticTransactions(walletAddress).length > 0);

        return hasPending ? POLLING_INTERVAL_MS : false;
      },
    });

  // Retain the last successful page so the list survives a failed "Show more"
  // (on error react-query drops the placeholder data).
  const lastFetchedTransactions = useRef<Transaction[]>([]);

  if (data?.data) {
    lastFetchedTransactions.current = data.data;
  }

  const fetchedTransactions = data?.data ?? lastFetchedTransactions.current;
  const showingAll = showAll && !isPlaceholderData && !isError;
  const apiTransactions = showingAll
    ? fetchedTransactions
    : fetchedTransactions.slice(0, INITIAL_VISIBLE_TRANSACTIONS);

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

  // "Show more" loads the maximum number of transactions allowed by the API.
  const isFetchingNextPage = isFetching && isPlaceholderData;
  const isFetchNextPageError = showAll && isError;
  const hasNextPage =
    !showAll && fetchedTransactions.length > INITIAL_VISIBLE_TRANSACTIONS;

  const fetchNextPage = () => {
    if (isFetchNextPageError) {
      void refetch();

      return;
    }

    setShowAll(true);
  };

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
