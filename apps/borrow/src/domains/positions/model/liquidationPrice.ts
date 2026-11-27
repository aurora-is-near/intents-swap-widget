import type { PositionAsset } from '../types';

/**
 * The collateral price at which the loan is liquidated:
 * `debtUsd / (amount × liquidationLtv)` (Web-Positions-Multi.dc.html's
 * script). Only for a loan with exactly one collateral reserve, debt and a
 * known liquidation LTV; with several collateral reserves no single price
 * liquidates it, so it is `null`.
 */
export const liquidationPriceOf = ({
  collateral,
  debtUsd,
  liquidationLtv,
}: {
  collateral: readonly PositionAsset[];
  debtUsd: number;
  liquidationLtv: number | null;
}): { symbol: string; usd: number } | null => {
  const [only, ...others] = collateral;

  if (
    !only ||
    others.length > 0 ||
    only.amount <= 0 ||
    debtUsd <= 0 ||
    liquidationLtv === null ||
    liquidationLtv <= 0
  ) {
    return null;
  }

  return { symbol: only.symbol, usd: debtUsd / (only.amount * liquidationLtv) };
};
