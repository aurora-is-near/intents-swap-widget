type FeeServiceCommonErrorCodes =
  | 'NOT_AUTHORIZED'
  | 'INVALID_AUTHORIZATION'
  | 'INVALID_API_KEY_CONFIGURATION';

export class FeeServiceApiError extends Error {
  code: string;

  constructor(code: string, message?: string) {
    super(message);
    this.code = code;
    this.name = 'FeeServiceApiError';
  }
}

// ------------------------------------------------------------

type FeeServiceGetApiKeysErrorCodes =
  | 'FAILED_TO_GET_API_KEYS'
  | 'INVALID_API_KEY_CONFIGURATION'
  | FeeServiceCommonErrorCodes;

export class FeeServiceGetApiKeysError extends FeeServiceApiError {
  constructor(code: FeeServiceGetApiKeysErrorCodes, message?: string) {
    super(code, message);
    this.name = 'FeeServiceGetApiKeysError';
  }
}

// ------------------------------------------------------------

type FeeServiceCreateApiKeyErrorCodes =
  | 'NOT_AUTHORIZED'
  | 'INVALID_AUTHORIZATION'
  | 'FAILED_TO_CREATE_API_KEY'
  | 'INVALID_API_KEY_CONFIGURATION'
  | FeeServiceCommonErrorCodes;

export class FeeServiceCreateApiKeyError extends FeeServiceApiError {
  constructor(code: FeeServiceCreateApiKeyErrorCodes, message?: string) {
    super(code, message);
    this.name = 'FeeServiceCreateApiKeyError';
  }
}

// ------------------------------------------------------------

type FeeServiceDeleteApiKeyErrorCodes =
  | 'FAILED_TO_DELETE_API_KEY'
  | FeeServiceCommonErrorCodes;

export class FeeServiceDeleteApiKeyError extends FeeServiceApiError {
  constructor(code: FeeServiceDeleteApiKeyErrorCodes, message?: string) {
    super(code, message);
    this.name = 'FeeServiceDeleteApiKeyError';
  }
}

// ------------------------------------------------------------

type FeeServiceUpdateApiKeyErrorCodes =
  | 'FAILED_TO_UPDATE_API_KEY'
  | FeeServiceCommonErrorCodes;

export class FeeServiceUpdateApiKeyError extends FeeServiceApiError {
  constructor(code: FeeServiceUpdateApiKeyErrorCodes, message?: string) {
    super(code, message);
    this.name = 'FeeServiceUpdateApiKeyError';
  }
}
