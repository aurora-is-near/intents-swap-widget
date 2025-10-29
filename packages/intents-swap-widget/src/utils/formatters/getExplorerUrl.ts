import { CHAIN_EXPLORERS } from '@/constants/chains';

export const getExplorerUrl = (chainId: number): string | undefined => {
  return CHAIN_EXPLORERS[chainId];
};
