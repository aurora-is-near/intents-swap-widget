import type { Token } from '@/types/token';

/**
 * Canonical key for a token's balance (and for use as a React list key).
 */
export const getTokenBalanceKey = (
  token: Pick<Token, 'assetId' | 'blockchain' | 'isIntent'>,
) => {
  return token.isIntent
    ? `intent-${token.assetId}`
    : `${token.assetId}-${token.blockchain}`;
};
