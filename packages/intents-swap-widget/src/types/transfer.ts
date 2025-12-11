import { Chains } from './chain';

export type TransferResult = {
  hash: string;
  transactionLink: string;
  intent?: string;
};

export type MakeTransferArgs = {
  amount: string;
  decimals: number;
  address: string;
  tokenAddress?: string;
  chain: Chains;
  evmChainId: number | null;
  isNativeEvmTokenTransfer: boolean;
  sourceAssetId: string;
  targetAssetId: string;
};
