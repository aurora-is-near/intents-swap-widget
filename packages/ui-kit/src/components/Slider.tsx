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

/**
 * `.ltvwrap` (lines 302, 44): 36px high, holding the track 12px from its
 * top. The artboard's `focus-within` outline was removed on purpose, so the
 * slider shows no focus ring. The disabled look is `.go:disabled`'s opacity
 * (line 57); the artboards have no disabled slider.
 */
const CONTROL =
  'relative box-border h-[36px] cursor-pointer touch-none pt-[12px] data-disabled:cursor-not-allowed data-disabled:opacity-50';

/**
 * The track (line 303): 10px high, radius 5. Base UI positions the thumb
 * inside it. `track` shows where no zone paints.
 */
const TRACK = 'h-[10px] rounded-[5px] bg-track';

/** The zone strip (lines 303–304): clipped to the track's radius. */
const ZONES = 'absolute inset-0 flex overflow-hidden rounded-[5px]';

/**
 * The plain track's fill. The repay slider (line 450, `.rs`) is a native
 * range with `accent-color:var(--ink)`, and the style block has no `.rs`
 * rule, so the fill is ink on the `track` colour.
 */
const INDICATOR = 'rounded-[5px] bg-ink';

/**
 * The liquidation marker (line 306): 3×22px `neg`, radius 2, 6px from the
 * control's top (−6px from the track's), centred on its value (see
 * `markerPosition`).
 */
const MARKER =
  'pointer-events-none absolute top-[-6px] h-[22px] w-[3px] rounded-[2px] bg-neg';

/**
 * The marker's label (line 302): 10px `neg`, 17px above the control's top
 * (−29px from the track's), centred on the marker.
 */
const MARKER_LABEL =
  'pointer-events-none absolute top-[-29px] font-sans text-[10px] whitespace-nowrap text-neg';

/**
 * The thumb (line 307): 24px, `sf`, 4px ink border, centred on the track
 * (5px from the control's top).
 */
const THUMB =
  'box-border size-[24px] rounded-full border-4 border-solid border-ink bg-sf';

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
        <SliderPrimitive.Control className={CONTROL}>
          <SliderPrimitive.Track className={TRACK}>
            {zones == null ? (
              <SliderPrimitive.Indicator className={INDICATOR} />
            ) : (
              <div aria-hidden className={ZONES} data-slot="zones">
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
                  <div
                    className={MARKER_LABEL}
                    id={markerLabelId}
                    style={markerStyle}>
                    {marker?.label}
                  </div>
                )}
                <div
                  aria-hidden
                  className={MARKER}
                  data-slot="marker"
                  style={markerStyle}
                />
              </>
            )}
            <SliderPrimitive.Thumb
              aria-describedby={describedBy}
              aria-label={ariaLabel}
              aria-labelledby={ariaLabelledBy}
              className={THUMB}
              getAriaValueText={getAriaValueText}
            />
          </SliderPrimitive.Track>
        </SliderPrimitive.Control>
      </SliderPrimitive.Root>
    );
  },
);

Slider.displayName = 'Slider';
