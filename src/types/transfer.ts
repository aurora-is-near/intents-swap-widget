import { Chains } from './chain';

export type TransferResult = {
  hash: string;
  transactionLink: string;
  intent?: string;
};

export type MakeTransferArgs = {
  amount: string;
  address: string;
  tokenAddress?: string;
  chain: Chains;
  evmChainId: number | null;
};
