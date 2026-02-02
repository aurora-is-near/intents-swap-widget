import { AxiosError } from 'axios';
import type { AxiosResponse } from 'axios';
import type { FeeConfig } from 'intents-1click-rule-engine';

import { apiKeySchema } from '../schemas';
import { feeServiceClient } from '../network';
import { FeeServiceCreateApiKeyError } from '../errors';
import type { ApiKey } from '../types';

import { DEFAULT_ZERO_FEE } from '@/constants';

export const createApiKey = async (authToken: string) => {
  let res: unknown;

  try {
    const response = await feeServiceClient.post<
      ApiKey,
      AxiosResponse<ApiKey>,
      FeeConfig
    >('/key', DEFAULT_ZERO_FEE, {
      headers: { Authorization: authToken },
    });

    res = response.data;
  } catch (error) {
    if (error instanceof AxiosError) {
      if (error.response?.status === 401) {
        throw new FeeServiceCreateApiKeyError('INVALID_AUTHORIZATION');
      }
    }

    throw new FeeServiceCreateApiKeyError('FAILED_TO_CREATE_API_KEY');
  }

  let data: ApiKey;

  try {
    data = apiKeySchema.parse(res);
  } catch (error) {
    throw new FeeServiceCreateApiKeyError('INVALID_API_KEY_CONFIGURATION');
  }

  return data;
};
