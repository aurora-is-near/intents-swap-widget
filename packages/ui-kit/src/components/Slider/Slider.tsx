import { useDirection } from '@base-ui/react/direction-provider';
import { Slider as SliderPrimitive } from '@base-ui/react/slider';
import { forwardRef, type ReactNode, useId } from 'react';

/**
 * The loan-to-value risk zones (Web-Borrow.dc.html line 304), safe to
 * risky. None has a token on the artboards, and they are the same in both
 * themes.
 */
export const RISK_ZONE_COLORS = [
  '#CBEA8C',
  '#F3E08A',
  '#F5B66B',
  '#E5694F',
] as const;

export type SliderZone = {
  /** Where the zone ends; it starts where the previous one ended, or at `min`. */
  upTo: number;
  /** Any CSS colour, such as one of `RISK_ZONE_COLORS`. */
  color: string;
};

export type SliderMarker = {
  value: number;
  /** Shown above the marker, such as `liq. 83%`; it also describes the slider. */
  label?: ReactNode;
};

/**
 * `orientation` and `thumbAlignment` are left out: the zones and the marker
 * are laid out for a horizontal track with a centre-aligned thumb, as on the
 * artboard.
 */
export type SliderProps = Omit<
  SliderPrimitive.Root.Props<number>,
  | 'className'
  | 'children'
  | 'render'
  | 'value'
  | 'defaultValue'
  | 'orientation'
  | 'thumbAlignment'
> & {
  value?: number;
  defaultValue?: number;
  /** Painted track segments, each as wide as its share of `min`…`max`. */
  zones?: readonly SliderZone[];
  /** A fixed mark on the track, such as the liquidation threshold. */
  marker?: SliderMarker;
  /** Names the slider when there is no visible label. */
  'aria-label'?: string;
  'aria-labelledby'?: string;
  'aria-describedby'?: string;
  /** Read out in place of the bare number, such as `40 percent`. */
  getAriaValueText?: SliderPrimitive.Thumb.Props['getAriaValueText'];
  className?: string;
};

const clamp = (value: number, low: number, high: number) =>
  Math.min(high, Math.max(low, value));

/**
 * Each zone with its width as a percentage of the track: its range over
 * `max − min`, clamped to the track. `upTo` values are ascending, so they
 * also serve as keys.
 */
const zoneWidths = (
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

const toPercent = (value: number, min: number, max: number) =>
  max > min ? clamp(((value - min) / (max - min)) * 100, 0, 100) : 0;

/**
 * Places the marker and its label as Base UI places the thumb: from the
 * inline start (the left in LTR, the right in RTL), centred by a
 * translation that flips in RTL. The zone strip is a flex row, so it
 * already runs from the inline start.
 */
const markerPosition = (percent: number, rtl: boolean) => ({
  insetInlineStart: `${percent}%`,
  translate: `${rtl ? 50 : -50}% 0`,
});

/**
 * A single-value slider (role `slider`) on Base UI's `Slider`. Arrow keys
 * move it by `step`, Page Up/Down by `largeStep`, Home and End jump to the
 * ends. With `zones` it is the loan-to-value slider; without, the plain
 * repay slider.
 */
export const Slider = forwardRef<HTMLDivElement, SliderProps>(
  (
    {
      zones,
      marker,
      min = 0,
      max = 100,
      'aria-label': ariaLabel,
      'aria-labelledby': ariaLabelledBy,
      'aria-describedby': ariaDescribedBy,
      getAriaValueText,
      className,
      ...props
    },
    ref,
  ) => {
    const markerLabelId = useId();
    const rtl = useDirection() === 'rtl';
    const hasMarkerLabel = marker?.label != null;
    const describedBy =
      [ariaDescribedBy, hasMarkerLabel ? markerLabelId : undefined]
        .filter(Boolean)
        .join(' ') || undefined;

    const markerStyle =
      marker == null
        ? undefined
        : markerPosition(toPercent(marker.value, min, max), rtl);

    return (
      <SliderPrimitive.Root
        ref={ref}
        className={className}
        max={max}
        min={min}
        {...props}>
        {/* `.ltvwrap` (lines 302, 44): 36px high, the track 12px from its
            top. The artboard's `focus-within` outline was removed on
            purpose; the disabled look is `.go:disabled`'s opacity (line 57). */}
        <SliderPrimitive.Control className="relative box-border h-9 cursor-pointer touch-none pt-3 data-disabled:cursor-not-allowed data-disabled:opacity-50">
          {/* The track (line 303); `track` shows where no zone paints. */}
          <SliderPrimitive.Track className="h-2.5 rounded-5 bg-track">
            {zones == null ? (
              // The repay slider (line 450, `.rs`) is a native range with
              // `accent-color:var(--ink)`, so the fill is ink.
              <SliderPrimitive.Indicator className="rounded-5 bg-ink" />
            ) : (
              <div
                aria-hidden
                className="absolute inset-0 flex overflow-hidden rounded-5"
                data-slot="zones">
                {zoneWidths(zones, min, max).map(({ upTo, color, width }) => (
                  <div
                    key={upTo}
                    className="h-full shrink-0"
                    data-slot="zone"
                    style={{ width: `${width}%`, background: color }}
                  />
                ))}
              </div>
            )}
            {markerStyle != null && (
              <>
                {hasMarkerLabel && (
                  // The marker's label (line 302): centred on the marker.
                  <div
                    className="pointer-events-none absolute -top-7.25 font-sans text-10 whitespace-nowrap text-neg"
                    id={markerLabelId}
                    style={markerStyle}>
                    {marker?.label}
                  </div>
                )}
                {/* The liquidation marker (line 306), centred on its value
                    (see `markerPosition`). */}
                <div
                  aria-hidden
                  className="pointer-events-none absolute -top-1.5 h-5.5 w-0.75 rounded-2 bg-neg"
                  data-slot="marker"
                  style={markerStyle}
                />
              </>
            )}
            {/* The thumb (line 307). With no focus ring on the control, it
                fills with ink while its input has keyboard focus; only
                forced-colors mode, where both fills match, adds an outline. */}
            <SliderPrimitive.Thumb
              aria-describedby={describedBy}
              aria-label={ariaLabel}
              aria-labelledby={ariaLabelledBy}
              className="box-border size-6 rounded-full border-4 border-solid border-ink bg-sf has-focus-visible:bg-ink forced-colors:has-focus-visible:outline-2 forced-colors:has-focus-visible:outline-offset-2 forced-colors:has-focus-visible:outline-solid forced-colors:has-focus-visible:outline-[Highlight]"
              getAriaValueText={getAriaValueText}
            />
          </SliderPrimitive.Track>
        </SliderPrimitive.Control>
      </SliderPrimitive.Root>
    );
  },
);

Slider.displayName = 'Slider';
