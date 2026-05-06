import type { Token } from '@/types/token';
import { isEvmAddress } from '../chains/isEvmAddress';
import { isEvmChain } from './isEvmChain';

export const isEvmToken = (token: Token) => {
  return !!(
    token.contractAddress &&
    isEvmAddress(token.contractAddress) &&
    isEvmChain(token.blockchain)
  );
};
