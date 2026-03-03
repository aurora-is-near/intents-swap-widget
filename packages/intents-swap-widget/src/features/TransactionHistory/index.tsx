import { useState } from 'react';
import { ErrorFillW700 as ErrorIcon } from '@material-symbols-svg/react-rounded/icons/error';

import { TransactionCard } from './TransactionCard';
import { TransactionDetails } from './TransactionDetails';
import { TransactionHistorySkeleton } from './TransactionHistorySkeleton';
import { TransactionHistoryEmpty } from './TransactionHistoryEmpty';
import { Button } from '@/components/Button';
import { useTokens, useTransactions, useWalletConnection } from '@/hooks';
import type { Transaction } from '@/types/transaction';

export const TransactionHistory = () => {
  const [selectedTx, setSelectedTx] = useState<Transaction | null>(null);
  const { isConnected } = useWalletConnection();

  const { tokens, isLoading: isLoadingTokens } = useTokens();
  const {
    transactions,
    isLoading: isLoadingTransactions,
    isError,
    refetch,
    hasNextPage,
    fetchNextPage,
    isFetchingNextPage,
  } = useTransactions();

  if (!isConnected) {
    return <TransactionHistoryEmpty type="connect" />;
  }

  if (isLoadingTokens || isLoadingTransactions) {
    return <TransactionHistorySkeleton />;
  }

  if (isError) {
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

  if (selectedTx) {
    return (
      <TransactionDetails
        transaction={selectedTx}
        tokens={tokens}
        onClose={() => {
          setSelectedTx(null);
        }}
      />
    );
  }

  return (
    <div className="flex flex-col gap-sw-md w-full">
      {transactions.map((tx, index) => (
        <TransactionCard
          key={`${tx.intentHashes}-${index}`}
          transaction={tx}
          tokens={tokens}
          onClick={() => {
            setSelectedTx(tx);
          }}
        />
      ))}

      {hasNextPage && (
        <Button
          size="lg"
          variant="outlined"
          className="mt-sw-2xl"
          state={isFetchingNextPage ? 'loading' : 'default'}
          onClick={() => fetchNextPage()}>
          Show more
        </Button>
      )}
    </div>
  );
};
