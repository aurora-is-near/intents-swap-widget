/**
 * The loan-to-value slider and its risk zones (Web-Borrow.dc.html line 304
 * for the track, line 1172 for the names): 0 to 90 in whole percent, step 1.
 * A zone runs from the previous zone's end (or 0) up to, but not including,
 * its own `upTo`; the last zone also takes the slider's end, 90.
 */

/** The slider's range, in whole percent. */
export const LTV_MIN = 0;
export const LTV_MAX = 90;
export const LTV_STEP = 1;

/**
 * The zones in order. `upTo` is named as the kit's `SliderZone` names it, so
 * the slider can take these bounds with its own colours.
 */
export const LTV_ZONES = [
  { name: 'Conservative', upTo: 50 },
  { name: 'Moderate', upTo: 65 },
  { name: 'Aggressive', upTo: 80 },
  { name: 'Near liquidation', upTo: LTV_MAX },
] as const;

type LtvZoneName = (typeof LTV_ZONES)[number]['name'];

/**
 * The zone a loan-to-value (whole percent) falls in: 49 is Conservative, 50
 * Moderate, 65 Aggressive, 80 Near liquidation. Anything at or above the
 * last zone's start is Near liquidation, so an LTV past the slider's end
 * still reads as the riskiest zone.
 */
export const zoneOf = (ltv: number): LtvZoneName =>
  LTV_ZONES.find(({ upTo }) => ltv < upTo)?.name ?? 'Near liquidation';
