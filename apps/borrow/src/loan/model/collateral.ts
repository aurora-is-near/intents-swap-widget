import { isReserveAvailable } from '../../markets/availability';
import type { CollateralReserve, MarketSnapshot } from '../../markets/types';
import { sameSymbol } from './symbols';

/**
 * Which Aave collateral a held asset funds (decided in the plan review): the
 * same asset when the market lists it as collateral, native ETH counting as
 * WETH (supplied through Aave's gateway); any other asset is converted to
 * WETH, and the form says "Supplied as WETH".
 */

const NATIVE = 'ETH';
const WRAPPED_NATIVE = 'WETH';

type CollateralChoice = {
  reserve: CollateralReserve;
  /** The held asset's symbol when it is converted to `reserve` first. */
  convertedFrom?: string;
};

/** A reserve listed and suppliable now, matched by symbol in any case. */
const listed = (market: MarketSnapshot, symbol: string) =>
  market.collateral.find(
    (reserve) =>
      sameSymbol(reserve.symbol, symbol) && isReserveAvailable(reserve),
  );

/**
 * The collateral `fundingSymbol` is supplied as in `market`. A reserve the
 * market lists but cannot take now counts as unlisted. `undefined` when the
 * market cannot take WETH either, so the asset cannot fund a loan there.
 */
export const collateralFor = (
  fundingSymbol: string,
  market: MarketSnapshot,
): CollateralChoice | undefined => {
  const symbol = sameSymbol(fundingSymbol, NATIVE)
    ? WRAPPED_NATIVE
    : fundingSymbol;

  const same = listed(market, symbol);

  if (same) {
    return { reserve: same };
  }

  const wrapped = listed(market, WRAPPED_NATIVE);

  return wrapped
    ? { reserve: wrapped, convertedFrom: fundingSymbol }
    : undefined;
};
