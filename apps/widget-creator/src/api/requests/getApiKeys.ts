import { z } from 'zod';
import { AxiosError } from 'axios';

import { apiKeySchema } from '../schemas';
import { axiosInstance } from '../network';
import { FeeServiceApiError } from '../errors';
import type { ApiKey } from '../types';

export const getApiKeys = async (authToken: string) => {
  let res: unknown;

  if (!authToken) {
    throw new FeeServiceApiError('NOT_AUTHORIZED');
  }

  try {
    const response = await axiosInstance.get('/key', {
      headers: { Authorization: authToken },
    });

    res = response.data;
  } catch (error) {
    if (error instanceof AxiosError) {
      if (error.response?.status === 401) {
        throw new FeeServiceApiError('INVALID_AUTHORIZATION');
      }
    }

    throw new FeeServiceApiError('FAILED_TO_GET_API_KEYS');
  }

  let data: ApiKey[] = [];

  try {
    data = z.array(apiKeySchema).parse(res);
  } catch (error) {
    throw new FeeServiceApiError('INVALID_API_KEY_CONFIGURATION');
  }

  if (data.length === 0) {
    throw new FeeServiceApiError('NO_API_KEYS_ASSIGNED');
  }

  return data;
};
