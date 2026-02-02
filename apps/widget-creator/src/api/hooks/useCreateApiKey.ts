import { useMutation, useQueryClient } from '@tanstack/react-query';
import { usePrivy } from '@privy-io/react-auth';

import { createApiKey } from '../requests/createApiKey';
import { FeeServiceCreateApiKeyError } from '../errors';
import type { ApiKey } from '../types';

export const useCreateApiKey = () => {
  const queryClient = useQueryClient();
  const { getAccessToken, user } = usePrivy();

  return useMutation<ApiKey, FeeServiceCreateApiKeyError>({
    mutationFn: async () => {
      const authToken = await getAccessToken();

      if (!authToken) {
        throw new FeeServiceCreateApiKeyError('NOT_AUTHORIZED');
      }

      return createApiKey(authToken);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: ['apiKeys', user?.id ?? 'anonymous'],
      });
    },
  });
};
