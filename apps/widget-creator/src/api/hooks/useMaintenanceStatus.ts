import { useQuery } from '@tanstack/react-query';

import { getMaintenanceStatus } from '../requests/getMaintenanceStatus';

const ONE_MINUTE = 60_000;

export const useMaintenanceStatus = () => {
  return useQuery({
    queryKey: ['maintenanceStatus'],
    queryFn: getMaintenanceStatus,
    refetchInterval: ONE_MINUTE,
  });
};
