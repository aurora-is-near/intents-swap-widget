import type { Token } from '@/types/token';

export const isEth = (token: Token) => {
  return token.symbol.toLowerCase() === 'eth';
};
