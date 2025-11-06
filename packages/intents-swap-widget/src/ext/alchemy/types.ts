import type { Chains } from '@/types/chain';
import type { ValueOf } from '@/types/utils';

export const CHAINS_MAP = {
  eth: 'eth-mainnet',
  bera: 'berachain-mainnet',
  base: 'base-mainnet',
  gnosis: 'gnosis-mainnet',
  arb: 'arb-mainnet',
  avax: 'avax-mainnet',
  op: 'opt-mainnet',
  pol: 'matic-mainnet',
  // btc: 'bitcoin-mainnet'
} as const satisfies Partial<Record<Chains, string>>;

export const isAlchemySupportedChain = (
  key: string,
): key is keyof typeof CHAINS_MAP => key in CHAINS_MAP;

export type AlchemyBalanceItem = {
  network: ValueOf<typeof CHAINS_MAP>;
  tokenAddress: string | null;
  tokenBalance: string; // hex balance
};

export type AlchemyResponse = {
  pageKey: string | null;
  data: AlchemyBalanceItem[];
};

export type AlchemyRequestParams = {
  pageParam: string | null;
  walletSupportedChains: ReadonlyArray<Chains>;
  walletAddress: string | null | undefined;
};
