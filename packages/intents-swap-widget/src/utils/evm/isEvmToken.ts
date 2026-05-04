import { isEvmAddress } from '../chains/isEvmAddress';
import { isEvmChain } from './isEvmChain';
import type { Token } from '@/types/token';

export const isEvmToken = (token: Token) => {
  return !!(
    token.contractAddress &&
    isEvmAddress(token.contractAddress) &&
    isEvmChain(token.blockchain)
  );
};
