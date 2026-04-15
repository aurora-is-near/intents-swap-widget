import { useMutation, useQueryClient } from '@tanstack/react-query';
import { usePrivy } from '@privy-io/react-auth';

import { FeeServiceUpdateWidgetConfigError } from '../errors';
import { updateWidgetConfig } from '../requests/updateWidgetConfig';
import type { RequestBody } from '../requests/updateWidgetConfig';
import type { WidgetConfigRecord } from '../types';

export const useUpdateWidgetConfig = (uuid: string) => {
  const queryClient = useQueryClient();
  const { getAccessToken, user } = usePrivy();

  return useMutation<
    WidgetConfigRecord,
    FeeServiceUpdateWidgetConfigError,
    RequestBody
  >({
    mutationFn: async (data: RequestBody) => {
      const authToken = await getAccessToken();

      if (!authToken) {
        throw new FeeServiceUpdateWidgetConfigError('NOT_AUTHORIZED');
      }

      return updateWidgetConfig(authToken, uuid, data);
    },
    onSuccess: (data) => {
      queryClient.setQueryData(['widgetConfig', data.uuid], data);
      queryClient.setQueryData(
        ['widgetConfig', 'current', user?.id ?? 'anonymous'],
        data,
      );
    },
  });
};
