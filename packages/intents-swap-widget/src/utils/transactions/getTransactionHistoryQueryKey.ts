const TRANSACTIONS_QUERY_KEY = 'transactions';

export const getTransactionHistoryQueryKey = (walletAddress?: string) =>
  [TRANSACTIONS_QUERY_KEY, walletAddress].filter(Boolean);
