import { z } from 'zod';

import { feeServiceClient } from '../network';

// Only `maintenance` matters here. `incidents` (chain incidents) are left out on
// purpose: they must not show the maintenance banner.
const incidentsResponseSchema = z
  .object({
    maintenance: z.array(z.unknown()).optional(),
  })
  .passthrough();

export type MaintenanceStatus = {
  isUnderMaintenance: boolean;
};

// The route ignores the API key, any value works.
export const getMaintenanceStatus = async (): Promise<MaintenanceStatus> => {
  const { data } = await feeServiceClient.get<unknown>(
    '/incidents/widget-creator',
  );

  // The server only returns maintenance windows that are in progress.
  const { maintenance } = incidentsResponseSchema.parse(data);

  return { isUnderMaintenance: (maintenance ?? []).length > 0 };
};
