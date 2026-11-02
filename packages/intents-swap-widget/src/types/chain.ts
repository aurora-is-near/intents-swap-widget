import { CHAINS, EVM_CHAINS } from '@/constants/chains';

export type Chains = (typeof CHAINS)[number];
export type EvmChains = (typeof EVM_CHAINS)[number];

export type Chain = {
  id: Chains;
  label: string;
};

export type ChainsFilter = {
  intents: 'none' | 'all' | 'with-balance';
  // `with-balance`: tokens on the wallet's chains that it holds
  external: 'none' | 'all' | 'wallet-supported' | 'with-balance';
};

export type ChainsFilters = {
  target: ChainsFilter;
  source: ChainsFilter;
};

export type ChainRpcUrls = Partial<Record<Chains, string[]>>;
