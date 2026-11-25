import { Slider } from '@aurora-is-near/ui-kit';
import { useId } from 'react';

import { liquidationLabel, LTV_ZONE_STYLES } from './ltvZoneStyles';
import { LTV_MAX, LTV_MIN, LTV_STEP, zoneOf } from './model/zones';

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
      <div className="mt-[20px] flex items-baseline justify-between leading-[normal]">
        <div className="text-[14px] font-semibold text-mut" id={labelId}>
          Loan to value · {zoneOf(ltv)}
        </div>
        <div
          aria-hidden="true"
          className="text-[28px] font-extrabold tracking-[-0.03em]">
          {ltv}%
        </div>
      </div>
      <Slider
        aria-label="Loan to value, percent"
        aria-describedby={labelId}
        className="mt-[22px]"
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
        zones={LTV_ZONE_STYLES}
        onValueChange={onLtvChange}
      />
    </>
  );
}
