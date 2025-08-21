import { CHAINS, EVM_CHAINS } from '@/constants/chains';

export type Chains = (typeof CHAINS)[number];
export type EvmChains = (typeof EVM_CHAINS)[number];

export type Chain = {
  id: Chains;
  icon: string;
  label: string;
};

export type DefaultChainsFilter = {
  intents: 'none' | 'all' | 'with-balance';
  external: 'none' | 'all' | 'wallet-supported';
};

export type ChainRpcUrls = Partial<Record<Chains, string[]>>;
