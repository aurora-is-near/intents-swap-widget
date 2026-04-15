import { AxiosError } from 'axios';
import type { AxiosResponse } from 'axios';

import { widgetConfigRecordSchema } from '../schemas';
import { feeServiceClient } from '../network';
import { FeeServiceUpdateWidgetConfigError } from '../errors';
import type {
  SerializableTheme,
  SerializableWidgetConfig,
  WidgetConfigRecord,
} from '../types';

export type RequestBody = {
  config: SerializableWidgetConfig;
  theme: SerializableTheme;
};

export const updateWidgetConfig = async (
  authToken: string,
  uuid: string,
  body: RequestBody,
) => {
  let res: unknown;

  try {
    const response = await feeServiceClient.put<
      WidgetConfigRecord,
      AxiosResponse<WidgetConfigRecord>,
      RequestBody
    >(`/widget-config/${uuid}`, body, {
      headers: { Authorization: authToken },
    });

    res = response.data;
  } catch (error) {
    let message = 'Failed to update widget config';

    if (error instanceof AxiosError) {
      message = error.response?.data?.message;

      if (error.response?.status === 401) {
        throw new FeeServiceUpdateWidgetConfigError('INVALID_AUTHORIZATION');
      }

      if (error.response?.status === 404) {
        throw new FeeServiceUpdateWidgetConfigError(
          'WIDGET_CONFIG_NOT_FOUND',
          message,
        );
      }
    }

    throw new FeeServiceUpdateWidgetConfigError(
      'FAILED_TO_UPDATE_WIDGET_CONFIG',
      message,
    );
  }

  try {
    return widgetConfigRecordSchema.parse(res);
  } catch {
    throw new FeeServiceUpdateWidgetConfigError('INVALID_WIDGET_CONFIG');
  }
};
