export type InitialDryStateError =
  | { code: 'SOURCE_TOKEN_IS_EMPTY' }
  | { code: 'TARGET_TOKEN_IS_EMPTY' }
  | { code: 'SOURCE_TOKEN_AMOUNT_IS_EMPTY' };

export type InitialInternalStateError =
  | InitialDryStateError
  | { code: 'SOURCE_TOKEN_NOT_INTENT' }
  | { code: 'SOURCE_BALANCE_INSUFFICIENT' }
  | { code: 'INVALID_SOURCE_BALANCE' };

export type InitialExternalStateError =
  | InitialDryStateError
  | { code: 'SOURCE_TOKEN_IS_INTENT' }
  | { code: 'SOURCE_BALANCE_INSUFFICIENT' }
  | { code: 'INVALID_SOURCE_BALANCE' }
  | { code: 'SEND_ADDRESS_IS_EMPTY' };

export type InputValidDryError =
  | { code: 'NO_NEAR_TOKEN_FOUND'; meta: { symbol: string } }
  | { code: 'TOKEN_IS_NOT_SUPPORTED' }
  | { code: 'QUOTE_FAILED'; meta: { message: string } }
  | { code: 'QUOTE_INVALID'; meta: { isDry: boolean } }
  | { code: 'QUOTE_INVALID_INITIAL'; meta: { isDry: boolean; message: string } }
  | {
      code: 'QUOTE_AMOUNT_IS_TOO_LOW';
      meta: { minAmount?: string };
    };

export type InputValidWalletError =
  | InputValidDryError
  | { code: 'QUOTE_NO_ONE_TIME_ADDRESS' };

export type QuoteSuccessDirectTransferError =
  | { code: 'DIRECT_TRANSFER_ERROR' }
  | { code: 'BRIDGE_SDK_FAILED' }
  | { code: 'FEES_NOT_ESTIMATED' };

export type QuoteSuccessTransferError =
  | { code: 'NO_QUOTE_FOUND' }
  | { code: 'NO_DEPOSIT_RESULT' }
  | { code: 'QUOTE_ERROR'; meta: { message: string } }
  | { code: 'TRANSFER_INVALID_INITIAL'; meta: { message: string } };

export type QuoteSuccessError =
  | QuoteSuccessDirectTransferError
  | QuoteSuccessTransferError;

export type ErrorType =
  | InitialDryStateError
  | InitialInternalStateError
  | InitialExternalStateError
  | InputValidDryError
  | InputValidWalletError
  | QuoteSuccessError;

export const QUOTE_ERRORS: Array<
  InputValidDryError['code'] | InputValidWalletError['code']
> = [
  'NO_NEAR_TOKEN_FOUND',
  'TOKEN_IS_NOT_SUPPORTED',
  'QUOTE_FAILED',
  'QUOTE_INVALID',
  'QUOTE_INVALID_INITIAL',
  'QUOTE_AMOUNT_IS_TOO_LOW',
  'QUOTE_NO_ONE_TIME_ADDRESS',
];

export const TRANSFER_ERRORS: Array<
  QuoteSuccessDirectTransferError['code'] | QuoteSuccessTransferError['code']
> = [
  'DIRECT_TRANSFER_ERROR',
  'BRIDGE_SDK_FAILED',
  'FEES_NOT_ESTIMATED',
  'NO_QUOTE_FOUND',
  'NO_DEPOSIT_RESULT',
  'QUOTE_ERROR',
  'TRANSFER_INVALID_INITIAL',
];

export const isQuoteError = (
  error: ErrorType,
): error is InputValidDryError | InputValidWalletError => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return QUOTE_ERRORS.includes(error.code as any);
};

export const isTransferError = (
  error: ErrorType,
): error is QuoteSuccessError => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return TRANSFER_ERRORS.includes(error.code as any);
};
