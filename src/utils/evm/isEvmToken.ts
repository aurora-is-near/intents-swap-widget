import { isAddress } from 'viem';

import type { Token } from '@/types/token';

import { isEvmChain } from './isEvmChain';

export const isEvmToken = (token: Token) => {
  return (
    token.contractAddress &&
    isAddress(token.contractAddress) &&
    isEvmChain(token.blockchain)
  );
};
