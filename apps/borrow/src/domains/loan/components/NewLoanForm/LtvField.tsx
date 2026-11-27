import { Slider } from '@aurora-is-near/ui-kit';
import { useId } from 'react';

import { formatBps } from '@/domains/markets/utils/format';

import { LTV_MAX, LTV_MIN, LTV_STEP, zoneOf } from '../../model/zones';
import { LTV_TRACK_ZONES } from '../../utils/ltvTrackZones';

/** "liq. 81%", "liq. 82.5%": the marker's label (script line 1574). */
const liquidationLabel = (liquidationLtvBps: number) =>
  `liq. ${formatBps(liquidationLtvBps)}`;

type LtvFieldProps = {
  /** Loan-to-value in whole percent. */
  ltv: number;
  onLtvChange: (ltv: number) => void;
  /**
   * The effective market's liquidation LTV, in bps; no marker while no
   * market is known.
   */
  liquidationLtvBps: number | undefined;
};

/**
 * The loan-to-value header and slider (Web-Borrow.dc.html lines 296–310):
 * "Loan to value · {zone}" in 14px / 600 `mut` beside the percentage in
 * 28px / 800 / -0.03em, baseline-aligned, 20px under the fee row; the
 * slider 22px under it, 0–90 in steps of 1, with the four zones and the
 * liquidation marker, clamped to the track's end as on line 1574.
 */
export function LtvField({
  ltv,
  onLtvChange,
  liquidationLtvBps,
}: LtvFieldProps) {
  const labelId = useId();

  return (
    <>
      <div className="mt-5 flex items-baseline justify-between leading-font">
        <div className="text-14 font-semibold text-mut" id={labelId}>
          Loan to value · {zoneOf(ltv)}
        </div>
        <div
          aria-hidden="true"
          className="text-28 font-extrabold tracking-figure">
          {ltv}%
        </div>
      </div>
      <Slider
        aria-label="Loan to value, percent"
        aria-describedby={labelId}
        className="mt-5.5"
        getAriaValueText={(_, value) => `${value}%`}
        marker={
          liquidationLtvBps === undefined
            ? undefined
            : {
                value: Math.min(LTV_MAX, liquidationLtvBps / 100),
                label: liquidationLabel(liquidationLtvBps),
              }
        }
        max={LTV_MAX}
        min={LTV_MIN}
        step={LTV_STEP}
        value={ltv}
        zones={LTV_TRACK_ZONES}
        onValueChange={onLtvChange}
      />
    </>
  );
}
