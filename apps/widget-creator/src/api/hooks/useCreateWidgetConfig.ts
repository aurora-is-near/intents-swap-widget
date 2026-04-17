import { useMutation, useQueryClient } from '@tanstack/react-query';
import { usePrivy } from '@privy-io/react-auth';

import { FeeServiceCreateWidgetConfigError } from '../errors';
import { createWidgetConfig } from '../requests/createWidgetConfig';
import type { RequestBody } from '../requests/createWidgetConfig';
import type { WidgetConfigRecord } from '../types';

export const useCreateWidgetConfig = () => {
  const queryClient = useQueryClient();
  const { getAccessToken, user } = usePrivy();

  return useMutation<
    WidgetConfigRecord,
    FeeServiceCreateWidgetConfigError,
    RequestBody
  >({
    mutationFn: async (body: RequestBody) => {
      const authToken = await getAccessToken();

      if (!authToken) {
        throw new FeeServiceCreateWidgetConfigError('NOT_AUTHORIZED');
      }

      return createWidgetConfig(authToken, body);
    },
    onSuccess: (data) => {
      queryClient.setQueryData(['widgetConfig', data.uuid], data);
      queryClient.setQueryData(['widgetConfig', 'current', user?.id], data);
    },
  });
};
