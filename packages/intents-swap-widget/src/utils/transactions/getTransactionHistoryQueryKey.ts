const TRANSACTIONS_QUERY_KEY = 'transactions';

export const getTransactionHistoryQueryKey = (walletAddress?: string | null) =>
  [TRANSACTIONS_QUERY_KEY, walletAddress].filter(Boolean);
