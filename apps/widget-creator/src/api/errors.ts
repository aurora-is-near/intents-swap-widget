type FeeServiceApiErrorCodes =
  | 'NOT_AUTHORIZED'
  | 'NO_API_KEYS_ASSIGNED'
  | 'INVALID_AUTHORIZATION'
  | 'FAILED_TO_GET_API_KEYS'
  | 'INVALID_API_KEY_CONFIGURATION';

export class FeeServiceApiError extends Error {
  code: FeeServiceApiErrorCodes;

  constructor(code: FeeServiceApiErrorCodes, message?: string) {
    super(message);
    this.code = code;
    this.name = 'FeeServiceApiError';
  }
}

export const isFeeServiceApiError = (
  error: unknown,
): error is FeeServiceApiError => {
  return error instanceof FeeServiceApiError;
};
