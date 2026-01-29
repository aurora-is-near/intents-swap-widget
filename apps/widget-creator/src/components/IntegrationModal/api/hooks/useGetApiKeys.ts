import { useQuery } from '@tanstack/react-query';
import { usePrivy } from '@privy-io/react-auth';

import { getApiKeys } from '../requests/getApiKeys';
import type { ApiKey } from '../types';

export const useGetApiKeys = () => {
  const { authenticated, getAccessToken } = usePrivy();

  return useQuery<ApiKey[]>({
    queryKey: ['apiKeys'],
    enabled: authenticated,
    queryFn: async () => {
      const authToken = await getAccessToken();

      return getApiKeys(authToken!);
    },
  });
};
