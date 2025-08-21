import type { Chains } from './chain';

export type Token = {
  isIntent: boolean;
  symbol: string;
  blockchain: Chains;
  chainName: string;
  contractAddress: string | undefined;
  decimals: number;
  assetId: string;
  name: string;
  price: number;
  icon: string;
  chainIcon: string;
};

export type TokenBalance = string | 0 | undefined;
export type TokenBalances = Record<string, TokenBalance>;
