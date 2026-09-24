import { getBasisPointsFromPercent } from './getBasisPointsFromPercent';

// Mirrors the fee service defaults: max(10 bps, 40% of client fee), with a
// 2 bps floor on stable-to-stable pairs. A custom floor applies to every pair.
const DEFAULT_AURORA_CUT_PERCENT = 40;
const DEFAULT_AURORA_FLOOR_BPS = 10;
const DEFAULT_AURORA_STABLE_FLOOR_BPS = 2;
const CLIENT_FEE_BPS_MAX = 100;

export const getAuroraFeeConfig = (
  auroraFeeBps?: number | null,
  auroraFeePercent?: number | null,
) => {
  const floorBps = auroraFeeBps ?? DEFAULT_AURORA_FLOOR_BPS;
  const stableFloorBps =
    auroraFeeBps != null ? null : DEFAULT_AURORA_STABLE_FLOOR_BPS;

  const cutPercent =
    auroraFeeBps != null ? (auroraFeePercent ?? 0) : DEFAULT_AURORA_CUT_PERCENT;

  return { floorBps, stableFloorBps, cutPercent };
};

export const getFeeShare = (
  feePercent: string,
  auroraFeeBps?: number | null,
  auroraFeePercent?: number | null,
) => {
  const { floorBps, cutPercent } = getAuroraFeeConfig(
    auroraFeeBps,
    auroraFeePercent,
  );

  const feeBps = Math.min(
    CLIENT_FEE_BPS_MAX,
    Math.max(floorBps, getBasisPointsFromPercent(feePercent)),
  );

  const auroraBps = Math.min(
    CLIENT_FEE_BPS_MAX,
    Math.max(floorBps, Math.floor((cutPercent / 100) * feeBps)),
  );

  const clientBps = Math.max(0, Math.floor(feeBps - auroraBps));

  return { auroraBps, clientBps, feeBps };
};
