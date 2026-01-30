import { z } from 'zod';
import { AxiosError } from 'axios';

import { apiKeySchema } from '../schemas';
import { axiosInstance } from '../network';
import { FeeServiceGetApiKeysError } from '../errors';
import type { ApiKey } from '../types';

export const getApiKeys = async (authToken: string) => {
  let res: unknown;

  try {
    const response = await axiosInstance.get('/key', {
      headers: { Authorization: authToken },
    });

    res = response.data;
  } catch (error) {
    if (error instanceof AxiosError) {
      if (error.response?.status === 401) {
        throw new FeeServiceGetApiKeysError('INVALID_AUTHORIZATION');
      }
    }

    throw new FeeServiceGetApiKeysError('FAILED_TO_GET_API_KEYS');
  }

  let data: ApiKey[] = [];

  try {
    data = z.array(apiKeySchema).parse(res);
  } catch (error) {
    throw new FeeServiceGetApiKeysError('INVALID_API_KEY_CONFIGURATION');
  }

  return data;
};
