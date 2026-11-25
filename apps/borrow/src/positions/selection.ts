import type { LoanPosition } from './types';

/**
 * The position shown when none is picked: the first at risk, so a loan close
 * to liquidation is what the user sees first, else the first.
 */
export const defaultPosition = (
  positions: readonly LoanPosition[],
): LoanPosition | undefined =>
  positions.find(({ status }) => status === 'at-risk') ?? positions[0];

/**
 * The position `id` names (the `position` search param of `/positions`), or
 * the default when it names none of them, such as a loan since closed.
 */
export const selectPosition = (
  positions: readonly LoanPosition[],
  id: string | undefined,
): LoanPosition | undefined =>
  (id === undefined ? undefined : positions.find((p) => p.id === id)) ??
  defaultPosition(positions);
