import { VList } from 'virtua';
import { useEffect, useMemo } from 'react';
import { ErrorFillW700 as ErrorIcon } from '@material-symbols-svg/react-rounded/icons/error';

import { TransactionCard } from './TransactionCard';
import { TransactionDetails } from './TransactionDetails';
import { TransactionHistorySkeleton } from './TransactionHistorySkeleton';
import { TransactionHistoryEmpty } from './TransactionHistoryEmpty';
import { FakeTransaction, Transaction } from '../../types';

import {
  LIST_CONTAINER_ID,
  MAX_LIST_VIEW_AREA_HEIGHT,
  MIN_LIST_VIEW_AREA_HEIGHT,
  TX_ITEM_HEIGHT,
} from './constants';
import { useTransactionHistoryListHeight } from './useTransactionHistoryListHeight';
import { Button } from '@/components/Button';
import { useTokens, useTransactions, useWalletConnection } from '@/hooks';

type Props = {
  onPendingTransactionsCountChange: (count: number) => void;
  selectedTransaction: Transaction | FakeTransaction | null;
  onSelectTransaction: (tx: Transaction | FakeTransaction | null) => void;
};

export const TransactionHistory = ({
  onPendingTransactionsCountChange,
  selectedTransaction,
  onSelectTransaction,
}: Props) => {
  const { isConnected } = useWalletConnection();

  const { tokens, isLoading: isLoadingTokens } = useTokens();
  const {
    transactions,
    pendingTransactionsCount,
    isLoading: isLoadingTransactions,
    isError,
    refetch,
    hasNextPage,
    fetchNextPage,
    isFetchingNextPage,
    isFetchNextPageError,
  } = useTransactions();

  useEffect(() => {
    onPendingTransactionsCountChange(pendingTransactionsCount);
  }, [pendingTransactionsCount, onPendingTransactionsCountChange]);

  const buttonText = useMemo(() => {
    if (isFetchingNextPage) {
      return 'Loading...';
    }

    if (isFetchNextPageError) {
      return 'Retry';
    }

    return 'Show more';
  }, [isFetchNextPageError, isFetchingNextPage]);

  const listHeight = useTransactionHistoryListHeight({
    transactionsCount: transactions.length,
    hasNextPage,
  });

  if (!isConnected) {
    return <TransactionHistoryEmpty type="connect" />;
  }

  if (isLoadingTokens || isLoadingTransactions) {
    return <TransactionHistorySkeleton />;
  }

  if (isError && !isFetchNextPageError) {
    return (
      <div className="flex flex-col items-center justify-center py-sw-3xl">
        <ErrorIcon className="w-[32px] h-[32px] text-sw-gray-200 mb-sw-lg" />
        <p className="text-sw-body-md text-sw-gray-300 text-center max-w-[265px] mb-sw-2xl">
          Failed to load transactions history.
        </p>
        <Button size="md" variant="primary" onClick={() => refetch()}>
          Retry
        </Button>
      </div>
    );
  }

  if (transactions.length === 0) {
    return <TransactionHistoryEmpty type="empty" />;
  }

  if (selectedTransaction) {
    return (
      <TransactionDetails
        transaction={selectedTransaction}
        tokens={tokens}
        onClose={() => {
          onSelectTransaction(null);
        }}
      />
    );
  }

  return (
    <div className="flex flex-col gap-sw-md w-full">
      <VList
        tabIndex={0}
        id={LIST_CONTAINER_ID}
        itemSize={TX_ITEM_HEIGHT}
        className="hide-scrollbar"
        style={{
          height: listHeight,
          minHeight: MIN_LIST_VIEW_AREA_HEIGHT,
          maxHeight: MAX_LIST_VIEW_AREA_HEIGHT,
          overflowAnchor: 'none',
          outline: 'none',
        }}>
        {transactions.map((tx, index) => (
          <TransactionCard
            key={index}
            transaction={tx}
            tokens={tokens}
            className="mb-sw-lg"
            onClick={() => {
              onSelectTransaction(tx);
            }}
          />
        ))}

        {hasNextPage && (
          <>
            {isFetchNextPageError && (
              <p className="text-sw-label-sm text-sw-status-error text-center mt-sw-2xl">
                Failed to load more transactions.
              </p>
            )}
            <Button
              size="lg"
              variant="outlined"
              className={isFetchNextPageError ? 'mt-sw-md' : 'mt-sw-2xl'}
              state={isFetchingNextPage ? 'loading' : 'default'}
              onClick={() => fetchNextPage()}>
              {buttonText}
            </Button>
          </>
        )}
      </VList>
    </div>
  );
};
