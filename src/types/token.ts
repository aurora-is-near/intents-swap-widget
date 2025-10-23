import type { Chains } from './chain';

export type SimpleToken = {
  assetId: string;
  symbol: string;
  blockchain: Chains;
  decimals: number;
  contractAddress?: string;
  price: number;
};

export type Token = SimpleToken & {
  isIntent: boolean;
  chainName: string;
  name: string;
  icon: string;
  chainIcon: string;
};

export type TokenBalance = string | 0 | undefined;
export type TokenBalances = Record<string, TokenBalance>;
