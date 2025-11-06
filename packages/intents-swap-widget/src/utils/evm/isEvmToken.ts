import { isAddress } from 'viem';

import { isEvmChain } from './isEvmChain';
import type { Token } from '@/types/token';

export const isEvmToken = (token: Token) => {
  return !!(
    token.contractAddress &&
    isAddress(token.contractAddress) &&
    isEvmChain(token.blockchain)
  );
};
