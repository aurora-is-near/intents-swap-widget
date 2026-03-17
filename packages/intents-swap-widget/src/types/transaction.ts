import { ComponentType } from 'react';

export type TransactionStatus =
  | 'SUCCESS'
  | 'PROCESSING'
  | 'WAITING_FOR_FUNDS'
  | 'PENDING'
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

export type FakeTransaction = Pick<
  Transaction,
  | 'originAsset'
  | 'destinationAsset'
  | 'amountInFormatted'
  | 'amountOutFormatted'
  | 'createdAt'
  | 'status'
  | 'amountInUsd'
  | 'amountOutUsd'
  | 'senders'
  | 'recipient'
  | 'originChainTxHashes'
> & {
  intentHashes?: string;
  isPoaDeposit?: boolean;
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

export type TransactionsStatusLabel = {
  label: string;
  colorClassName: string;
  Icon?: ComponentType<{ className?: string }>;
  iconIsSpinning?: boolean;
};
