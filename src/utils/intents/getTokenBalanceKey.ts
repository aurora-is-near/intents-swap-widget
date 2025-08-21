import type { Token } from '@/types/token';

export const getTokenBalanceKey = (token: Token) => {
  return token.isIntent ? `intent-${token.assetId}` : token.assetId;
};
