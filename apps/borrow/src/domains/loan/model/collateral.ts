import { isReserveAvailable } from '@/domains/markets/utils/availability';
import type {
  CollateralReserve,
  MarketSnapshot,
} from '@/domains/markets/types';

import { DEFAULT_PAIR, fundsAsItself, sameSymbol } from './reserveAssets';

/*
 * Which Aave collateral a held asset funds (decided in the plan reviews): the
 * same asset when the market lists it as collateral, a native token counting
 * as the wrapped reserve it is delivered as (ETH as WETH, POL as WPOL); any
 * other asset is converted first, to WETH when
 * the market can take it, else to the market's wrapped native, and the form
 * says "Supplied as <symbol>".
 */

export type CollateralChoice = {
  reserve: CollateralReserve;
  /** The held asset's symbol when it is converted to `reserve` first. */
  convertedFrom?: string;
};

/** A reserve listed and suppliable now that `symbol` funds as itself. */
const listed = (market: MarketSnapshot, symbol: string) =>
  market.collateral.find(
    (reserve) =>
      fundsAsItself(reserve.symbol, symbol) && isReserveAvailable(reserve),
  );

/**
 * What any other held asset is converted to, when suppliable now: WETH, else
 * the reserve delivered natively (WPOL).
 */
const conversionTarget = (market: MarketSnapshot) => {
  const available = market.collateral.filter(isReserveAvailable);

  return (
    available.find(({ symbol }) => sameSymbol(symbol, 'WETH')) ??
    available.find(({ nativeDelivery }) => nativeDelivery === true)
  );
};

/**
 * The collateral `fundingSymbol` is supplied as in `market`. A reserve the
 * market lists but cannot take now counts as unlisted. `undefined` when the
 * market has no conversion target either, so the asset cannot fund a loan
 * there.
 */
export const collateralFor = (
  fundingSymbol: string,
  market: MarketSnapshot,
): CollateralChoice | undefined => {
  const same = listed(market, fundingSymbol);

  if (same) {
    return { reserve: same };
  }

  const target = conversionTarget(market);

  return target ? { reserve: target, convertedFrom: fundingSymbol } : undefined;
};

/**
 * The collateral symbol a funding asset is read for across the markets: the
 * asset itself (a native token as its wrapped reserve) when any market lists
 * it, else WETH, to which it is converted (decided in the plan review).
 */
export const collateralSymbolFor = (
  fundingSymbol: string,
  snapshots: readonly MarketSnapshot[],
): string =>
  snapshots
    .map((snapshot) => collateralFor(fundingSymbol, snapshot))
    .find((choice) => choice !== undefined && !choice.convertedFrom)?.reserve
    .symbol ?? DEFAULT_PAIR.collateral;
