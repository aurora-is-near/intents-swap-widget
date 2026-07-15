import type { QuoteResponse } from '@defuse-protocol/one-click-sdk-typescript';

import type { AppFee } from './transaction';

type QuoteResponseShort = Pick<
  QuoteResponse['quote'],
  | 'amountIn'
  | 'amountOut'
  | 'amountInUsd'
  | 'amountOutUsd'
  | 'amountOutFormatted'
  | 'timeEstimate'
>;

// The applied app fees, resolved server-side and echoed back on
// `QuoteResponse.quoteRequest.appFees`. They may be split across several
// recipients and can differ from the configured `appFees`, so we carry the
// response value on the quote rather than reading config.
type WithAppFees = {
  appFees?: readonly AppFee[];
};

export type QuoteDry = QuoteResponseShort &
  WithAppFees & {
    type: 'QUOTE_DRY_WITH_AMOUNT';
    dry: true;
    deadline?: never;
    depositAddress?: never;
  };

export type QuoteReal = QuoteResponseShort &
  WithAppFees & {
    type: 'QUOTE_REAL_WITH_AMOUNT';
    dry: false;
    deadline?: string;
    depositAddress: string;
    depositMemo?: string;
  };

export type QuoteDepositAnyAmount = WithAppFees & {
  type: 'QUOTE_DEPOSIT_ANY_AMOUNT';
  depositAddress: string;
  deadline?: string;
  timeEstimate: number;
  depositMemo?: string;
  dry: boolean;
};

export type Quote = QuoteDry | QuoteReal | QuoteDepositAnyAmount;

export type SwapConfidentialMode = 'public' | 'confidential';

export type FetchQuoteOptions = {
  isRefetch?: boolean;
  signal?: AbortSignal;
};
