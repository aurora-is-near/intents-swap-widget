import { AxiosError } from 'axios';

import { tosAcceptanceSchema } from '../schemas';
import { feeServiceClient } from '../network';
import { FeeServiceGetTosError } from '../errors';
import type { TosAcceptance } from '../types';

export const getTosAcceptance = async (
  authToken: string,
): Promise<TosAcceptance> => {
  let res: unknown;

  try {
    const response = await feeServiceClient.get('/tos', {
      headers: { Authorization: authToken },
    });

    res = response.data;
  } catch (error) {
    if (error instanceof AxiosError && error.response?.status === 401) {
      throw new FeeServiceGetTosError('INVALID_AUTHORIZATION');
    }

    throw new FeeServiceGetTosError('FAILED_TO_GET_TOS');
  }

  try {
    return tosAcceptanceSchema.parse(res);
  } catch (error) {
    throw new FeeServiceGetTosError('INVALID_TOS_RESPONSE');
  }
};
