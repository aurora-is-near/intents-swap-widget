import { useQuery } from '@tanstack/react-query';
import { usePrivy } from '@privy-io/react-auth';

import { getApiKeys } from '../requests/getApiKeys';
import type { ApiKey } from '../types';

export const useApiKeys = () => {
  const { authenticated, getAccessToken, user } = usePrivy();

  return useQuery<ApiKey[]>({
    queryKey: ['apiKeys', user?.id ?? 'anonymous'],
    enabled: authenticated,
    queryFn: async () => {
      const authToken = await getAccessToken();

      return getApiKeys(authToken!);
    },
  });
};
