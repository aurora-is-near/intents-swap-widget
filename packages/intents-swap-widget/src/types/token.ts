import type { Chains } from './chain';

export type SimpleToken = {
  assetId: string;
  symbol: string;
  blockchain: Chains;
  decimals: number;
  contractAddress?: string;
  price: number;
  icon?: string;
};

export type Token = Omit<SimpleToken, 'icon'> & {
  icon: string;
  isIntent: boolean;
  chainName: string;
  name: string;
  chainIcon: string;
};

export type TokenBalance = string | 0 | undefined;
export type TokenBalances = Record<string, TokenBalance>;
