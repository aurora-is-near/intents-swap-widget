export type TransactionStatus =
  | 'SUCCESS'
  | 'PROCESSING'
  | 'WAITING_FOR_FUNDS'
  | 'FAILED'
  | 'REFUNDED';

export type AppFee = {
  fee: number;
  recipient: string;
};

export type Transaction = {
  originAsset: string;
  destinationAsset: string;
  depositAddress: string;
  depositAddressAndMemo: string;
  recipient: string;
  status: TransactionStatus;
  createdAt: string;
  createdAtTimestamp: number;
  intentHashes: string;
  referral: string;
  amountInFormatted: string;
  amountOutFormatted: string;
  appFees: AppFee[];
  nearTxHashes: string[];
  originChainTxHashes: string[];
  destinationChainTxHashes: string[];
  amountIn: string;
  amountInUsd: string;
  amountOut: string;
  amountOutUsd: string;
  refundTo: string;
  senders: string[];
  refundReason: string | null;
};

export type TransactionsResponse = {
  data: Transaction[];
  totalPages: number;
  page: number;
  perPage: number;
  total: number;
  nextPage: number | null;
  prevPage: number | null;
};
