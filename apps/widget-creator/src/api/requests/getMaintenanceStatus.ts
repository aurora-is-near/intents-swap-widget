import { z } from 'zod';

import { feeServiceClient } from '../network';

// The route takes an API key but doesn't check it, so any value works.
const INCIDENTS_PATH = '/incidents/widget-creator';

// `incidents` (chain incidents) is left out on purpose: only maintenance shows
// the banner. An older fee service may not send `maintenance` at all.
const incidentsResponseSchema = z.object({
  maintenance: z.array(z.unknown()).nullish(),
});

// A window with no `finishesAt` runs until it's taken down.
const maintenanceWindowSchema = z.object({
  startsAt: z.string(),
  finishesAt: z.string().nullish(),
});

export type MaintenanceStatus = {
  isUnderMaintenance: boolean;
};

// The server only sends windows in progress. Check the times again anyway, so
// a malformed, upcoming or finished window never shows the banner.
const isInProgress = (window: unknown, now: number) => {
  const parsed = maintenanceWindowSchema.safeParse(window);

  if (!parsed.success) {
    return false;
  }

  const startsAt = Date.parse(parsed.data.startsAt);
  const finishesAt = parsed.data.finishesAt
    ? Date.parse(parsed.data.finishesAt)
    : Infinity;

  // An unparsable date is NaN, which fails both comparisons.
  return startsAt <= now && now <= finishesAt;
};

export const getMaintenanceStatus = async (): Promise<MaintenanceStatus> => {
  const { data } = await feeServiceClient.get<unknown>(INCIDENTS_PATH);

  // A malformed response reads as no maintenance instead of failing the query,
  // so a banner shown earlier doesn't stick around.
  const parsed = incidentsResponseSchema.safeParse(data);

  if (!parsed.success) {
    return { isUnderMaintenance: false };
  }

  const now = Date.now();

  return {
    isUnderMaintenance: (parsed.data.maintenance ?? []).some((window) =>
      isInProgress(window, now),
    ),
  };
};
