import { isAxiosError } from 'axios';

import { isErrorLikeObject } from './isErrorLikeObject';

export const getResponseErrorMessage = (error: unknown): string | undefined => {
  if (
    isAxiosError<{ message?: unknown }>(error) &&
    typeof error.response?.data.message === 'string'
  ) {
    return error.response.data.message;
  }

  return isErrorLikeObject(error) ? error.message : undefined;
};
