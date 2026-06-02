import { ComponentType } from 'react';

export type TransactionType = 'SWAP' | 'DEPOSIT' | 'WITHDRAWAL';

export type TransactionStatus =
  | 'SUCCESS'
  | 'PROCESSING'
  | 'WAITING_FOR_FUNDS'
  | 'PENDING'
  | 'FAILED'
  | 'REFUNDED'
  | 'UNRESOLVED';

export type AppFee = {
  fee: number;
  recipient: string;
};

export type Transaction = {
  originAsset: string;
  destinationAsset: string;
  depositAddress: string;
  depositMemo: string | null;
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
  recipientType: 'DESTINATION_CHAIN' | 'INTENTS';
  depositType: 'ORIGIN_CHAIN' | 'INTENTS';
  refundType: 'ORIGIN_CHAIN' | 'INTENTS' | null;
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
  | 'recipientType'
  | 'depositType'
  | 'refundTo'
  | 'refundType'
> & {
  intentHashes?: string;
  depositAddress?: string;
};

export type TransactionsResponse = Transaction[];

export type TransactionsStatusLabel = {
  label: string;
  colorClassName: string;
  Icon?: ComponentType<{ className?: string }>;
  iconIsSpinning?: boolean;
};
