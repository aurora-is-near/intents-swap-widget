import type { Reserve } from '../types';

/** A reserve as error messages name it: its symbol and token address. */
export const reserveName = (reserve: Reserve) =>
  `${reserve.symbol} (${reserve.tokenAddress})`;
