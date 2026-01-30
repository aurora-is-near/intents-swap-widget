import { AxiosError } from 'axios';

import { axiosInstance } from '../network';
import { FeeServiceDeleteApiKeyError } from '../errors';

export const deleteApiKey = async (authToken: string, apiKey: string) => {
  try {
    await axiosInstance.delete<null>(`/key/${apiKey}`, {
      headers: { Authorization: authToken },
    });
  } catch (error) {
    if (error instanceof AxiosError) {
      if (error.response?.status === 401) {
        throw new FeeServiceDeleteApiKeyError('INVALID_AUTHORIZATION');
      }
    }

    throw new FeeServiceDeleteApiKeyError('FAILED_TO_DELETE_API_KEY');
  }

  return null;
};
