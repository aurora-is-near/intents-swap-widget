import { RISK_ZONE_COLORS, type SliderZone } from '@aurora-is-near/ui-kit';

import { formatBps } from '../markets/format';
import { LTV_ZONES } from './model/zones';

/** Each zone's colour from the kit's risk colours, safe to risky (line 304). */
const ZONE_COLORS = {
  Conservative: RISK_ZONE_COLORS[0],
  Moderate: RISK_ZONE_COLORS[1],
  Aggressive: RISK_ZONE_COLORS[2],
  'Near liquidation': RISK_ZONE_COLORS[3],
} as const;

/**
 * The model's four zones with their colours, as the New loan slider and the
 * position's read-only bar paint them.
 */
export const LTV_ZONE_STYLES: readonly SliderZone[] = LTV_ZONES.map(
  ({ name, upTo }) => ({ upTo, color: ZONE_COLORS[name] }),
);

/** "liq. 81%", "liq. 82.5%": the marker's label (script line 1574). */
export const liquidationLabel = (liquidationLtvBps: number) =>
  `liq. ${formatBps(liquidationLtvBps)}`;
