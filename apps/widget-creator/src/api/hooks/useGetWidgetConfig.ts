import { useQuery } from '@tanstack/react-query';

import { getWidgetConfig } from '../requests/getWidgetConfig';
import { FeeServiceGetWidgetConfigError } from '../errors';
import type { WidgetConfigRecord } from '../types';

export const useGetWidgetConfig = (uuid?: string | null) => {
  return useQuery<WidgetConfigRecord, FeeServiceGetWidgetConfigError>({
    queryKey: ['widgetConfig', uuid ?? 'missing'],
    enabled: Boolean(uuid),
    queryFn: async () => {
      if (!uuid) {
        throw new FeeServiceGetWidgetConfigError('FAILED_TO_GET_WIDGET_CONFIG');
      }

      return getWidgetConfig(uuid);
    },
  });
};
