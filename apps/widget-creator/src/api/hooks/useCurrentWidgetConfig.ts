import { useQuery } from '@tanstack/react-query';
import { usePrivy } from '@privy-io/react-auth';

import { getCurrentWidgetConfig } from '../requests/getCurrentWidgetConfig';
import { FeeServiceGetWidgetConfigError } from '../errors';
import type { WidgetConfigRecord } from '../types';

export const useCurrentWidgetConfig = ({
  enabled = true,
}: {
  enabled?: boolean;
} = {}) => {
  const { authenticated, getAccessToken, user } = usePrivy();

  return useQuery<WidgetConfigRecord | null, FeeServiceGetWidgetConfigError>({
    queryKey: ['widgetConfig', 'current', user?.id],
    enabled: enabled && authenticated,
    retry: false,
    queryFn: async () => {
      const authToken = await getAccessToken();

      if (!authToken) {
        throw new FeeServiceGetWidgetConfigError('NOT_AUTHORIZED');
      }

      try {
        return await getCurrentWidgetConfig(authToken);
      } catch {
        return null;
      }
    },
  });
};
