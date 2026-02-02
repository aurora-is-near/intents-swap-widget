import { useMutation, useQueryClient } from '@tanstack/react-query';
import { usePrivy } from '@privy-io/react-auth';

import { deleteApiKey } from '../requests/deleteApiKey';
import { FeeServiceDeleteApiKeyError } from '../errors';

export const useDeleteApiKey = (apiKey: string) => {
  const queryClient = useQueryClient();
  const { getAccessToken, user } = usePrivy();

  return useMutation<null, FeeServiceDeleteApiKeyError>({
    mutationFn: async () => {
      const authToken = await getAccessToken();

      if (!authToken) {
        throw new FeeServiceDeleteApiKeyError('NOT_AUTHORIZED');
      }

      return deleteApiKey(authToken, apiKey);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: ['apiKeys', user?.id ?? 'anonymous'],
      });
    },
  });
};
