import { isReserveAvailable } from '../../markets/availability';
import type { CollateralReserve, MarketSnapshot } from '../../markets/types';
import { sameSymbol } from './symbols';

/**
 * Which Aave collateral a held asset funds (decided in the plan review): the
 * same asset when the market lists it as collateral, ETH and WETH both
 * counting as the wrapped-native reserve (WETH, or the reserve delivered
 * natively and supplied through Aave's gateway); any other asset is
 * converted to that reserve, and the form says "Supplied as WETH".
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
 * The wrapped-native collateral (WETH) listed and suppliable now: the
 * reserve delivered natively (supplied through Aave's gateway, whatever
 * symbol it carries) or else the one named WETH.
 */
const wrappedNative = (market: MarketSnapshot) => {
  const available = market.collateral.filter(isReserveAvailable);

  return (
    available.find(({ nativeDelivery }) => nativeDelivery === true) ??
    available.find(({ symbol }) => sameSymbol(symbol, WRAPPED_NATIVE))
  );
};

/**
 * The collateral `fundingSymbol` is supplied as in `market`. A reserve the
 * market lists but cannot take now counts as unlisted. `undefined` when the
 * market cannot take WETH either, so the asset cannot fund a loan there.
 */
export const collateralFor = (
  fundingSymbol: string,
  market: MarketSnapshot,
): CollateralChoice | undefined => {
  const wrapped = wrappedNative(market);

  const same =
    sameSymbol(fundingSymbol, NATIVE) ||
    sameSymbol(fundingSymbol, WRAPPED_NATIVE)
      ? wrapped
      : listed(market, fundingSymbol);

  if (same) {
    return { reserve: same };
  }

  return wrapped
    ? { reserve: wrapped, convertedFrom: fundingSymbol }
    : undefined;
};
