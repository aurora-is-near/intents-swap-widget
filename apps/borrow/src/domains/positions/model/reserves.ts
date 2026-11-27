import type { PositionAsset } from '../types';

/** The sum of the reserves' dollar values; unpriced ones count as 0. */
export const sumUsd = (assets: readonly PositionAsset[]): number =>
  assets.reduce((total, { usd }) => total + (usd ?? 0), 0);

/**
 * A reserves total as it may be shown: `null` when one of them has no price,
 * since the sum would leave it out.
 */
export const pricedTotal = (
  assets: readonly PositionAsset[],
  usd: number,
): number | null => (assets.some((asset) => asset.usd === null) ? null : usd);

/** Largest dollar value first; unpriced reserves last, in their order. */
export const byUsdDescending = (assets: readonly PositionAsset[]) =>
  assets.toSorted((a, b) => (b.usd ?? -1) - (a.usd ?? -1));

/**
 * What a Collateral or Debt tile shows: the largest reserve, and how many
 * more there are ("+2 more"). `undefined` with no reserves.
 */
export const largestReserve = (
  assets: readonly PositionAsset[],
): { asset: PositionAsset; more: number } | undefined => {
  const [asset] = byUsdDescending(assets);

  return asset ? { asset, more: assets.length - 1 } : undefined;
};
