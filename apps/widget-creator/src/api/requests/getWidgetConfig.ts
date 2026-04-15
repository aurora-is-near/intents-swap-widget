import { AxiosError } from 'axios';

import { widgetConfigRecordSchema } from '../schemas';
import { feeServiceClient } from '../network';
import { FeeServiceGetWidgetConfigError } from '../errors';

export const getWidgetConfig = async (uuid: string) => {
  let res: unknown;

  try {
    const response = await feeServiceClient.get(`/widget-config/${uuid}`);

    res = response.data;
  } catch (error) {
    let message = 'Failed to get widget config';

    if (error instanceof AxiosError) {
      message = error.response?.data?.message ?? message;

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
