import { isReserveAvailable } from '@/domains/markets/utils/availability';
import type {
  CollateralReserve,
  MarketSnapshot,
} from '@/domains/markets/types';

import { DEFAULT_PAIR, sameSymbol } from './reserveAssets';

/*
 * Which Aave collateral a held asset funds (decided in the plan review): the
 * same asset when the market lists it as collateral, ETH and WETH both
 * counting as the wrapped-native reserve (WETH, or the reserve delivered
 * natively and supplied through Aave's gateway); any other asset is
 * converted to that reserve, and the form says "Supplied as WETH".
 */

export type CollateralChoice = {
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
    available.find(({ symbol }) => sameSymbol(symbol, 'WETH'))
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
    sameSymbol(fundingSymbol, 'ETH') || sameSymbol(fundingSymbol, 'WETH')
      ? wrapped
      : listed(market, fundingSymbol);

  if (same) {
    return { reserve: same };
  }

  return wrapped
    ? { reserve: wrapped, convertedFrom: fundingSymbol }
    : undefined;
};

/**
 * The collateral symbol a funding asset is read for across the markets: the
 * asset itself (ETH as WETH) when any market lists it, else WETH, to which
 * it is converted (decided in the plan review).
 */
export const collateralSymbolFor = (
  fundingSymbol: string,
  snapshots: readonly MarketSnapshot[],
): string =>
  snapshots
    .map((snapshot) => collateralFor(fundingSymbol, snapshot))
    .find((choice) => choice !== undefined && !choice.convertedFrom)?.reserve
    .symbol ?? DEFAULT_PAIR.collateral;
