import { getBasisPointsFromPercent } from './getBasisPointsFromPercent';

const AURORA_FEE_CUT_PERCENT = 0.4;
const AURORA_FEE_BPS_MIN = 2;
const CLIENT_FEE_BPS_MIN = 2;
const CLIENT_FEE_BPS_MAX = 100;

export const getFeeShare = (feePercent: string) => {
  const feeBps = Math.min(
    CLIENT_FEE_BPS_MAX,
    Math.max(CLIENT_FEE_BPS_MIN, getBasisPointsFromPercent(feePercent)),
  );

  const auroraBps = Math.max(
    AURORA_FEE_BPS_MIN,
    Math.floor(AURORA_FEE_CUT_PERCENT * feeBps),
  );

  const clientBps = Math.floor(feeBps - auroraBps);

  return { auroraBps, clientBps, feeBps };
};
