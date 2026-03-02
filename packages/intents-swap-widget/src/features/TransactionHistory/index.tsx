import { TransactionCard } from './TransactionCard';
import { TransactionHistorySkeleton } from './TransactionHistorySkeleton';
import { TransactionHistoryEmpty } from './TransactionHistoryEmpty';
import { Button } from '@/components/Button';
import { useTokens, useTransactions } from '@/hooks';

export const TransactionHistory = () => {
  const { tokens, isLoading: isLoadingTokens } = useTokens();
  const {
    transactions,
    isLoading: isLoadingTransactions,
    hasNextPage,
    fetchNextPage,
    isFetchingNextPage,
  } = useTransactions();

  if (isLoadingTokens || isLoadingTransactions) {
    return <TransactionHistorySkeleton />;
  }

  if (transactions.length === 0) {
    return <TransactionHistoryEmpty />;
  }

  return (
    <div className="flex flex-col gap-sw-md w-full">
      {transactions.map((tx, index) => (
        <TransactionCard
          key={`${tx.intentHashes}-${index}`}
          transaction={tx}
          tokens={tokens}
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
