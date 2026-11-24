/**
 * The slider's track maths, kept pure so it is tested as numbers; where the
 * browser draws them is for visual checks.
 */

export type SliderZone = {
  /** Where the zone ends; it starts where the previous one ended, or at `min`. */
  upTo: number;
  /** Any CSS colour, such as one of `RISK_ZONE_COLORS`. */
  color: string;
};

const clamp = (value: number, low: number, high: number) =>
  Math.min(high, Math.max(low, value));

/**
 * Each zone with its width as a percentage of the track: its range over
 * `max − min`, clamped to the track. `upTo` values are ascending, so they
 * also serve as keys.
 */
export const zoneWidths = (
  zones: readonly SliderZone[],
  min: number,
  max: number,
): (SliderZone & { width: number })[] => {
  const span = max - min;
  let start = min;

  return zones.map((zone) => {
    const end = clamp(zone.upTo, start, max);
    const width = span > 0 ? ((end - start) / span) * 100 : 0;

    start = end;

    return { ...zone, width };
  });
};

/** Where `value` sits on the track, as `(value − min) / (max − min)` in %, clamped to 0–100. */
export const toPercent = (value: number, min: number, max: number) =>
  max > min ? clamp(((value - min) / (max - min)) * 100, 0, 100) : 0;

/**
 * Places the marker and its label as Base UI places the thumb: from the
 * inline start (the left in LTR, the right in RTL), centred by a
 * translation that flips in RTL. The zone strip is a flex row, so it
 * already runs from the inline start.
 */
export const markerPosition = (percent: number, rtl: boolean) => ({
  insetInlineStart: `${percent}%`,
  translate: `${rtl ? 50 : -50}% 0`,
});
