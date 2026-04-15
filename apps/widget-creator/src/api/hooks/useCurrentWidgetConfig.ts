import { useQuery } from '@tanstack/react-query';
import { usePrivy } from '@privy-io/react-auth';

import { getCurrentWidgetConfig } from '../requests/getCurrentWidgetConfig';
import { FeeServiceGetWidgetConfigError } from '../errors';
import type { WidgetConfigRecord } from '../types';

export const useCurrentWidgetConfig = () => {
  const { authenticated, getAccessToken, user } = usePrivy();

  return useQuery<WidgetConfigRecord, FeeServiceGetWidgetConfigError>({
    queryKey: ['widgetConfig', 'current', user?.id ?? 'anonymous'],
    enabled: authenticated,
    retry: false,
    queryFn: async () => {
      const authToken = await getAccessToken();

      if (!authToken) {
        throw new FeeServiceGetWidgetConfigError('NOT_AUTHORIZED');
      }

      return getCurrentWidgetConfig(authToken);
    },
  });
};
