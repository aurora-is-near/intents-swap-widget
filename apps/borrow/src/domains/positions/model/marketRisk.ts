import { liquidationPriceOf } from './liquidationPrice';
import type { LoanPosition, PositionAsset, PositionMarketRisk } from '../types';

/**
 * The reserves' `figure` averaged by their dollar value; `null` when any
 * reserve lacks the figure or a price, or there is nothing to weigh.
 */
const usdWeighted = (
  assets: readonly PositionAsset[],
  figure: (asset: PositionAsset) => number | null,
): number | null => {
  const figures = assets.map((asset) => ({
    value: figure(asset),
    usd: asset.usd,
  }));

  if (figures.some(({ value, usd }) => value === null || usd === null)) {
    return null;
  }

  const total = figures.reduce((sum, { usd }) => sum + (usd ?? 0), 0);
  const weighted = figures.reduce(
    (sum, { value, usd }) => sum + (value ?? 0) * (usd ?? 0),
    0,
  );

  return total > 0 ? weighted / total : null;
};

/**
 * The loan with the figures a position read lacks, from its market's risk
 * figures: the liquidation LTV (collateral thresholds weighted by value, as
 * Aave computes it), the borrow APR (rates weighted by debt), the interest a
 * year, and the liquidation price.
 */
export const withMarketRisk = (
  position: LoanPosition,
  { assets }: PositionMarketRisk,
): LoanPosition => {
  const liquidationLtv = usdWeighted(
    position.collateral,
    ({ address }) => assets[address]?.liquidationThreshold ?? null,
  );

  const borrowApr = usdWeighted(
    position.debt,
    ({ address }) => assets[address]?.borrowApr ?? null,
  );

  return {
    ...position,
    liquidationLtv,
    borrowApr,
    interestPerYearUsd:
      borrowApr === null ? null : position.debtUsd * borrowApr,
    liquidationPrice: liquidationPriceOf({
      collateral: position.collateral,
      debtUsd: position.debtUsd,
      liquidationLtv,
    }),
  };
};

/**
 * Whether a loan's card shows figures only its market gives: one with debt
 * and collateral. A repaid loan shows none, so its market is not read.
 */
export const needsMarketRisk = (position: LoanPosition): boolean =>
  position.debt.length > 0 && position.collateral.length > 0;
