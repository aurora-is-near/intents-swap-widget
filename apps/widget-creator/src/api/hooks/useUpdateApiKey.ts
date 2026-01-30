import { useMutation, useQueryClient } from '@tanstack/react-query';
import { usePrivy } from '@privy-io/react-auth';

import { FeeServiceCreateApiKeyError } from '../errors';
import { updateApiKey } from '../requests/updateApiKey';
import type { RequestBody } from '../requests/updateApiKey';
import type { ApiKey } from '../types';

export const useUpdateApiKey = (apiKey: string) => {
  const queryClient = useQueryClient();
  const { getAccessToken, user } = usePrivy();

  return useMutation<ApiKey, FeeServiceCreateApiKeyError, RequestBody>({
    mutationFn: async (data: RequestBody) => {
      const authToken = await getAccessToken();

      if (!authToken) {
        throw new FeeServiceCreateApiKeyError('NOT_AUTHORIZED');
      }

      return updateApiKey(authToken, apiKey, data);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: ['apiKeys', user?.id ?? 'anonymous'],
      });
    },
  });
};
