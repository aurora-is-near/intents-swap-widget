import type { AaveMarket } from '../../config/registry';

/** The error for a value the read did not return, naming the market. */
export const missing = (market: AaveMarket, what: string) =>
  new Error(`Aave ${market.name}: missing ${what}`);
