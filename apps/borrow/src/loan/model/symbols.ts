/**
 * Reserves and held assets are matched by symbol, in any case, so
 * Arbitrum's bridged `USDC.e` is not taken for USDC.
 */
export const sameSymbol = (a: string, b: string) =>
  a.toLowerCase() === b.toLowerCase();
