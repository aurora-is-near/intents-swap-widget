import type { LoanPosition, PositionAsset } from '../types';

export type PositionsTotals = {
  /** Listed loans, repaid ones included (the tab badge and `N POSITIONS`). */
  count: number;
  /** `null` when a balance has no price: the sum would not be the total. */
  debtUsd: number | null;
  collateralUsd: number | null;
};

/**
 * The dollar value of every reserve, a balance listed twice counted once;
 * a copy with a price wins over one without. `null` when some balance has no
 * price in any copy.
 */
const uniqueUsd = (reserves: readonly PositionAsset[]): number | null => {
  const prices = new Map<string, number | null>();

  reserves.forEach(({ id, usd }) => {
    prices.set(id, prices.get(id) ?? usd);
  });

  const values = [...prices.values()];

  return values.some((usd) => usd === null)
    ? null
    : values.reduce<number>((total, usd) => total + (usd ?? 0), 0);
};

/** The figures of the summary block and the tab badge. */
export const positionsTotals = (
  positions: readonly LoanPosition[],
): PositionsTotals => ({
  count: positions.length,
  debtUsd: uniqueUsd(positions.flatMap(({ debt }) => debt)),
  collateralUsd: uniqueUsd(positions.flatMap(({ collateral }) => collateral)),
});
