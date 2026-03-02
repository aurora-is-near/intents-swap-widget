import {
  CHAIN_EXPLORERS,
  CHAIN_EXPLORERS_BY_CHAIN_NAME,
  CHAIN_IDS_MAP,
} from '@/constants/chains';
import type { Chains } from '@/types/chain';

export const getTransactionLink = (
  chain: Chains | number | undefined,
  hash: string,
): string => {
  if (!chain) {
    return '';
  }

  const chainId = typeof chain === 'number' ? chain : CHAIN_IDS_MAP[chain];

  if (!chainId || !CHAIN_EXPLORERS[chainId]) {
    if (typeof chain === 'number') {
      return '';
    }

    return CHAIN_EXPLORERS_BY_CHAIN_NAME[chain]
      ? `${CHAIN_EXPLORERS_BY_CHAIN_NAME[chain]}${hash}`
      : '';
  }

  return `${CHAIN_EXPLORERS[chainId]}${hash}`;
};
