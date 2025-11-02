import { isEvmChain } from './isEvmChain';
import { EVM_CHAIN_BASE_TOKENS } from '@/constants/chains';
import type { Token } from '@/types/token';

export const isEvmBaseToken = (token: Token) => {
  if (!isEvmChain(token.blockchain)) {
    return false;
  }

  return token.symbol === EVM_CHAIN_BASE_TOKENS[token.blockchain];
};
