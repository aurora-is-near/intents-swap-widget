import { AxiosError } from 'axios';
import type { AxiosResponse } from 'axios';

import { widgetConfigRecordSchema } from '../schemas';
import { feeServiceClient } from '../network';
import { FeeServiceCreateWidgetConfigError } from '../errors';
import type {
  SerializableTheme,
  SerializableWidgetConfig,
  WidgetConfigRecord,
} from '../types';

export type RequestBody = {
  config: SerializableWidgetConfig;
  theme: SerializableTheme;
};

export const createWidgetConfig = async (
  authToken: string,
  body: RequestBody,
) => {
  let res: unknown;

  try {
    const response = await feeServiceClient.post<
      WidgetConfigRecord,
      AxiosResponse<WidgetConfigRecord>,
      RequestBody
    >('/widget-config', body, {
      headers: { Authorization: authToken },
    });

    res = response.data;
  } catch (error) {
    let message = 'Failed to create widget config';

    if (error instanceof AxiosError) {
      message = error.response?.data?.message ?? message;

      if (error.response?.status === 401) {
        throw new FeeServiceCreateWidgetConfigError('INVALID_AUTHORIZATION');
      }

      if (error.response?.status === 409) {
        throw new FeeServiceCreateWidgetConfigError(
          'WIDGET_CONFIG_ALREADY_EXISTS',
          message,
        );
      }
    }

    throw new FeeServiceCreateWidgetConfigError(
      'FAILED_TO_CREATE_WIDGET_CONFIG',
      message,
    );
  }

  try {
    return widgetConfigRecordSchema.parse(res);
  } catch {
    throw new FeeServiceCreateWidgetConfigError('INVALID_WIDGET_CONFIG');
  }
};
