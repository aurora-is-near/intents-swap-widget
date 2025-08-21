import { EVM_CHAINS } from '@/constants/chains';
import type { Chains, EvmChains } from '@/types/chain';

export const isEvmChain = (chain: Chains): chain is EvmChains => {
  return (EVM_CHAINS as readonly string[]).includes(chain);
};
