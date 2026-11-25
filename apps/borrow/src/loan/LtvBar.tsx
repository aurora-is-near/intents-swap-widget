import { formatBps } from '../markets/format';
import { liquidationLabel, LTV_ZONE_STYLES } from './ltvZoneStyles';
import { LTV_MAX, LTV_MIN } from './model/zones';

/** Each zone's width on the track: from the previous zone's end to its own. */
const ZONE_WIDTHS = LTV_ZONE_STYLES.map(({ upTo, color }, index) => ({
  color,
  width: upTo - (LTV_ZONE_STYLES[index - 1]?.upTo ?? LTV_MIN),
}));

/** A whole-percent LTV as a share of the track, clamped to its end. */
const trackPercent = (ltv: number) =>
  (Math.min(LTV_MAX, Math.max(LTV_MIN, ltv)) / LTV_MAX) * 100;

/** "50%", "82.5%": the knob's value as read out. */
const PERCENT = new Intl.NumberFormat('en-US', { maximumFractionDigits: 1 });

type LtvBarProps = {
  /** Loan-to-value in percent; no knob when it is unknown. */
  ltv: number | null;
  /** The liquidation LTV, in bps; no marker when it is unknown. */
  liquidationLtvBps: number | null;
  /** The visible label the bar is named by. */
  labelledBy: string;
  className?: string;
};

/**
 * The New loan slider's track drawn read-only, for a loan that exists
 * (Web-Positions-Multi.dc.html lines 420–425): 36px high, the four zones on a
 * 10px track 12px from the top (radius 5), the liquidation marker (3×22px
 * `neg`, radius 2, 6px from the top) with its 10px `neg` label 17px above
 * the bar, and the knob (24px `sf`, 4px ink border, 5px from the top). The
 * knob and the marker sit at `value / 90` of the track, clamped to its end
 * (script line 1395), as the slider does.
 *
 * It is a `meter`: assistive technology reads the LTV and the liquidation
 * point as one value. With the LTV unknown it is an image saying so.
 */
export function LtvBar({
  ltv,
  liquidationLtvBps,
  labelledBy,
  className,
}: LtvBarProps) {
  const valueText = [
    ltv === null ? 'Unknown' : `${PERCENT.format(ltv)}%`,
    liquidationLtvBps === null
      ? undefined
      : `liquidation at ${formatBps(liquidationLtvBps)}`,
  ]
    .filter(Boolean)
    .join(', ');

  // A meter must have a value: with the LTV unknown, the bar is an image
  // named by what it shows.
  const semantics =
    ltv === null
      ? ({
          role: 'img',
          'aria-label': `Loan to value: ${valueText}`,
        } as const)
      : ({
          role: 'meter',
          'aria-labelledby': labelledBy,
          'aria-valuemin': LTV_MIN,
          'aria-valuemax': LTV_MAX,
          'aria-valuenow': Math.min(LTV_MAX, Math.max(LTV_MIN, ltv)),
          'aria-valuetext': valueText,
        } as const);

  return (
    <div className={`relative h-[36px] ${className ?? ''}`} {...semantics}>
      {liquidationLtvBps !== null ? (
        <div
          aria-hidden="true"
          className="pointer-events-none absolute top-[-17px] -translate-x-1/2 font-sans text-[10px] leading-[normal] whitespace-nowrap text-neg"
          style={{ left: `${trackPercent(liquidationLtvBps / 100)}%` }}>
          {liquidationLabel(liquidationLtvBps)}
        </div>
      ) : null}
      <div className="absolute top-[12px] right-0 left-0 flex h-[10px] overflow-hidden rounded-[5px]">
        {ZONE_WIDTHS.map(({ color, width }) => (
          <div key={color} style={{ flex: width, background: color }} />
        ))}
      </div>
      {liquidationLtvBps !== null ? (
        <div
          className="absolute top-[6px] h-[22px] w-[3px] -translate-x-1/2 rounded-[2px] bg-neg"
          style={{ left: `${trackPercent(liquidationLtvBps / 100)}%` }}
        />
      ) : null}
      {ltv !== null ? (
        <div
          className="absolute top-[5px] box-border size-[24px] -translate-x-1/2 rounded-full border-4 border-solid border-ink bg-sf"
          style={{ left: `${trackPercent(ltv)}%` }}
        />
      ) : null}
    </div>
  );
}
