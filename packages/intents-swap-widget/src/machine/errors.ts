import type { Chains } from '@/types/chain';

export type InitialDryStateError =
  | { code: 'SOURCE_TOKEN_IS_EMPTY' }
  | { code: 'TARGET_TOKEN_IS_EMPTY' }
  | { code: 'SOURCE_TOKEN_AMOUNT_IS_EMPTY' }
  | { code: 'SOURCE_BALANCE_INSUFFICIENT' };

export type InitialInternalStateError =
  | InitialDryStateError
  | { code: 'SOURCE_TOKEN_NOT_INTENT' }
  | { code: 'INVALID_SOURCE_BALANCE' };

type SendAddressValidationError =
  | {
      code: 'SEND_ADDRESS_IS_NOT_VERIFIED';
      meta: { address: string; chain: Chains };
    }
  | {
      code: 'SEND_ADDRESS_IS_NOT_FOUND';
      meta: { address: string; chain: Chains };
    };

export type InitialExternalStateError =
  | InitialDryStateError
  | SendAddressValidationError
  | { code: 'SOURCE_TOKEN_IS_INTENT' }
  | { code: 'INVALID_SOURCE_BALANCE' }
  | { code: 'SEND_ADDRESS_IS_EMPTY' }
  | {
      code: 'SEND_ADDRESS_IS_INVALID';
      meta: { address: string; chain: Chains };
    };

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
  | { code: 'DIRECT_TRANSFER_ERROR'; meta?: { message?: string } }
  | { code: 'BRIDGE_SDK_FAILED' }
  | { code: 'FEES_NOT_ESTIMATED' };

export type QuoteSuccessTransferError =
  | { code: 'NO_QUOTE_FOUND' }
  | { code: 'NO_DEPOSIT_RESULT' }
  | { code: 'QUOTE_ERROR'; meta: { message: string } }
  | { code: 'TRANSFER_INVALID_INITIAL'; meta: { message: string } }
  | { code: 'EXTERNAL_TRANSFER_FAILED' }
  | { code: 'EXTERNAL_TRANSFER_REFUNDED' }
  | { code: 'EXTERNAL_TRANSFER_INCOMPLETE' };

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
  'EXTERNAL_TRANSFER_FAILED',
  'EXTERNAL_TRANSFER_REFUNDED',
  'EXTERNAL_TRANSFER_INCOMPLETE',
];

export const SEND_ADDRESS_VALIDATION_ERRORS: Array<
  SendAddressValidationError['code']
> = ['SEND_ADDRESS_IS_NOT_VERIFIED', 'SEND_ADDRESS_IS_NOT_FOUND'];

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

export const isAsyncSendAddressValidationError = (
  error: ErrorType,
): error is SendAddressValidationError => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return SEND_ADDRESS_VALIDATION_ERRORS.includes(error.code as any);
};
