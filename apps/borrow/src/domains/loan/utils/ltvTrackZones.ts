import { RISK_ZONE_COLORS } from '@aurora-is-near/ui-kit';
import type { SliderZone } from '@aurora-is-near/ui-kit';

import { LTV_ZONES } from '../model/zones';

/** Each zone's colour from the kit's risk colours, safe to risky (line 304). */
const ZONE_COLORS = {
  Conservative: RISK_ZONE_COLORS[0],
  Moderate: RISK_ZONE_COLORS[1],
  Aggressive: RISK_ZONE_COLORS[2],
  'Near liquidation': RISK_ZONE_COLORS[3],
} as const;

/**
 * The model's four zones as the LTV track paints them: the New loan slider
 * (Web-Borrow.dc.html line 304) and a position's read-only bar
 * (Web-Positions-Multi.dc.html line 422).
 */
export const LTV_TRACK_ZONES: readonly SliderZone[] = LTV_ZONES.map(
  ({ name, upTo }) => ({ upTo, color: ZONE_COLORS[name] }),
);
