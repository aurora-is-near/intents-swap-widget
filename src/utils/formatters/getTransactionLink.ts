import { CHAIN_EXPLORERS } from '@/constants/chains';

export const getTransactionLink = (
  chainId: number | undefined,
  hash: string,
): string => {
  if (!chainId || !CHAIN_EXPLORERS[chainId]) {
    return `${CHAIN_EXPLORERS[1]}${hash}`;
  }

  return `${CHAIN_EXPLORERS[chainId]}${hash}`;
};
