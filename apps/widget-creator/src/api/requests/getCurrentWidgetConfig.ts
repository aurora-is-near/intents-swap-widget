import { AxiosError } from 'axios';

import { widgetConfigRecordSchema } from '../schemas';
import { feeServiceClient } from '../network';
import { FeeServiceGetWidgetConfigError } from '../errors';

export const getCurrentWidgetConfig = async (authToken: string) => {
  let res: unknown;

  try {
    const response = await feeServiceClient.get('/widget-config', {
      headers: { Authorization: authToken },
    });

    res = response.data;
  } catch (error) {
    let message = 'Failed to get widget config';

    if (error instanceof AxiosError) {
      message = error.response?.data?.message ?? message;

      if (error.response?.status === 401) {
        throw new FeeServiceGetWidgetConfigError('INVALID_AUTHORIZATION');
      }

      if (error.response?.status === 404) {
        throw new FeeServiceGetWidgetConfigError(
          'WIDGET_CONFIG_NOT_FOUND',
          message,
        );
      }
    }

    throw new FeeServiceGetWidgetConfigError(
      'FAILED_TO_GET_WIDGET_CONFIG',
      message,
    );
  }

  try {
    return widgetConfigRecordSchema.parse(res);
  } catch {
    throw new FeeServiceGetWidgetConfigError('INVALID_WIDGET_CONFIG');
  }
};
