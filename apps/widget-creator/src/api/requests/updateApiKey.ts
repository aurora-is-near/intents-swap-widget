import { AxiosError } from 'axios';
import type { AxiosResponse } from 'axios';
import type { FeeConfig } from 'intents-1click-rule-engine';

import { apiKeySchema } from '../schemas';
import { feeServiceClient } from '../network';
import { FeeServiceUpdateApiKeyError } from '../errors';
import type { ApiKey } from '../types';

export type RequestBody = {
  isEnabled: boolean;
  feeRules: FeeConfig;
};

export const updateApiKey = async (
  authToken: string,
  apiKey: string,
  body: RequestBody,
) => {
  let res: unknown;

  try {
    const response = await feeServiceClient.patch<
      ApiKey,
      AxiosResponse<ApiKey>,
      RequestBody
    >(`/key/${apiKey}`, body, {
      headers: { Authorization: authToken },
    });

    res = response.data;
  } catch (error) {
    let message = 'Failed to update API key';

    if (error instanceof AxiosError) {
      message = error.response?.data?.message;

      if (error.response?.status === 401) {
        throw new FeeServiceUpdateApiKeyError('INVALID_AUTHORIZATION');
      }
    }

    throw new FeeServiceUpdateApiKeyError('FAILED_TO_UPDATE_API_KEY', message);
  }

  let data: ApiKey;

  try {
    data = apiKeySchema.parse(res);
  } catch (error) {
    throw new FeeServiceUpdateApiKeyError('INVALID_API_KEY_CONFIGURATION');
  }

  return data;
};
