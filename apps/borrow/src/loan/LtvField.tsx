import {
  RISK_ZONE_COLORS,
  Slider,
  type SliderZone,
} from '@aurora-is-near/ui-kit';
import { useId } from 'react';

import { LTV_MAX, LTV_MIN, LTV_STEP, LTV_ZONES, zoneOf } from './model/zones';

/** Each zone's colour from the kit's risk colours, safe to risky (line 304). */
const ZONE_COLORS = {
  Conservative: RISK_ZONE_COLORS[0],
  Moderate: RISK_ZONE_COLORS[1],
  Aggressive: RISK_ZONE_COLORS[2],
  'Near liquidation': RISK_ZONE_COLORS[3],
} as const;

/** The model's four zones, painted on the track. */
const ZONES: readonly SliderZone[] = LTV_ZONES.map(({ name, upTo }) => ({
  upTo,
  color: ZONE_COLORS[name],
}));

const PERCENT = new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 });

/** "liq. 81%", "liq. 82.5%": the marker's label (script line 1574). */
const liquidationLabel = (liquidationLtvBps: number) =>
  `liq. ${PERCENT.format(liquidationLtvBps / 100)}%`;

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
        zones={ZONES}
        onValueChange={onLtvChange}
      />
    </>
  );
}
