import { cn } from '@aurora-is-near/ui-kit';

import { LTV_MAX, LTV_MIN } from '@/domains/loan/model/zones';
import { LTV_TRACK_ZONES } from '@/domains/loan/utils/ltvTrackZones';

import { formatLiquidationLtv, formatLtv } from '../../utils/positionFormat';

/*
 * A loan's LTV on the four-zone track, read-only
 * (Web-Positions-Multi.dc.html lines 420–425): the New loan slider's track,
 * marker and knob (the kit's `Slider`), with no control to move.
 */

/** Where an LTV in whole percent sits on the track, clamped to its ends. */
const leftOf = (percent: number) =>
  `${((Math.min(LTV_MAX, Math.max(LTV_MIN, percent)) - LTV_MIN) / (LTV_MAX - LTV_MIN)) * 100}%`;

/** Each zone's share of the track, as a flex grow factor. */
const ZONE_WIDTHS = LTV_TRACK_ZONES.map(({ upTo, color }, index) => ({
  upTo,
  color,
  grow: upTo - (LTV_TRACK_ZONES[index - 1]?.upTo ?? LTV_MIN),
}));

type LtvMeterProps = {
  /** The loan's LTV as a fraction; no knob when unknown. */
  ltv: number | null;
  /** The liquidation LTV as a fraction; no marker when unknown. */
  liquidationLtv: number | null;
  /** The visible label's id ("Loan to value"). */
  labelledBy: string;
  className?: string;
};

/**
 * A `meter` for assistive technology, in whole percent, whose text names
 * the liquidation LTV too; "Unknown" text without an LTV.
 */
export function LtvMeter({
  ltv,
  liquidationLtv,
  labelledBy,
  className,
}: LtvMeterProps) {
  const liquidation =
    liquidationLtv === null ? undefined : formatLiquidationLtv(liquidationLtv);

  // A meter needs a value: with no LTV the track is drawn without one, and
  // "Unknown" is read after the label instead.
  const meter =
    ltv === null
      ? {}
      : {
          role: 'meter',
          'aria-labelledby': labelledBy,
          'aria-valuemin': LTV_MIN,
          'aria-valuemax': LTV_MAX,
          // Clamped to the track, as ARIA requires; the text keeps the true
          // LTV.
          'aria-valuenow': Math.min(
            LTV_MAX,
            Math.max(LTV_MIN, Math.round(ltv * 1000) / 10),
          ),
          'aria-valuetext': [
            formatLtv(ltv),
            liquidation && `liquidated at ${liquidation}`,
          ]
            .filter(Boolean)
            .join(', '),
        };

  return (
    <div className={cn('relative h-9', className)} {...meter}>
      {ltv === null ? <span className="sr-only">Unknown</span> : null}
      <div
        aria-hidden
        className="absolute inset-x-0 top-3 flex h-2.5 overflow-hidden rounded-5">
        {ZONE_WIDTHS.map(({ upTo, color, grow }) => (
          <div key={upTo} style={{ flexGrow: grow, backgroundColor: color }} />
        ))}
      </div>
      {liquidationLtv === null ? null : (
        <>
          <div
            aria-hidden
            className="absolute -top-4.25 -translate-x-1/2 font-sans text-10 whitespace-nowrap text-neg"
            style={{ left: leftOf(liquidationLtv * 100) }}>
            liq. {liquidation}
          </div>
          <div
            aria-hidden
            className="absolute top-1.5 h-5.5 w-0.75 -translate-x-1/2 rounded-2 bg-neg"
            style={{ left: leftOf(liquidationLtv * 100) }}
          />
        </>
      )}
      {ltv === null ? null : (
        <div
          aria-hidden
          className="absolute top-1.25 box-border size-6 -translate-x-1/2 rounded-full border-4 border-solid border-ink bg-sf"
          style={{ left: leftOf(ltv * 100) }}
        />
      )}
    </div>
  );
}
