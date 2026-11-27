import type { LoanPosition, PositionAsset } from '../types';

export type PositionsTotals = {
  /** Listed loans, repaid ones included (the tab badge and `N POSITIONS`). */
  count: number;
  debtUsd: number;
  collateralUsd: number;
};

/** The dollar value of every reserve, a balance listed twice counted once. */
const uniqueUsd = (reserves: readonly PositionAsset[]) =>
  [
    ...new Map(reserves.map((asset) => [asset.id, asset.usd ?? 0])).values(),
  ].reduce((total, usd) => total + usd, 0);

/** The figures of the summary block and the tab badge. */
export const positionsTotals = (
  positions: readonly LoanPosition[],
): PositionsTotals => ({
  count: positions.length,
  debtUsd: uniqueUsd(positions.flatMap(({ debt }) => debt)),
  collateralUsd: uniqueUsd(positions.flatMap(({ collateral }) => collateral)),
});
