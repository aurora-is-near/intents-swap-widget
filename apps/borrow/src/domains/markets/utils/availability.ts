import type { ReserveUnavailableReason } from '../types';

type Availability = {
  unavailable?: boolean;
  unavailableReason?: ReserveUnavailableReason;
};

/**
 * Whether a reserve can take a new loan now: neither marked `unavailable`
 * nor given a reason (cap reached or coming soon). Both reasons count alike.
 */
export const isReserveAvailable = (reserve: Availability): boolean =>
  reserve.unavailable !== true && reserve.unavailableReason === undefined;

/** Whether the borrow action does not cover the reserve yet. */
export const isComingSoon = (reserve: Availability): boolean =>
  reserve.unavailableReason === 'coming-soon';

/**
 * Marks a reserve unavailable for `reason`. `coming-soon` takes the place of
 * `cap-reached`, never the other way round.
 */
export const markUnavailable = <Reserve extends Availability>(
  reserve: Reserve,
  reason: ReserveUnavailableReason,
): Reserve => ({
  ...reserve,
  unavailable: true,
  unavailableReason: isComingSoon(reserve) ? 'coming-soon' : reason,
});
