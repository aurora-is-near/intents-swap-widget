import type { QuoteResponse } from '@defuse-protocol/one-click-sdk-typescript';

type QuoteResponseShort = Pick<
  QuoteResponse['quote'],
  | 'amountIn'
  | 'amountOut'
  | 'amountInUsd'
  | 'amountOutUsd'
  | 'amountOutFormatted'
  | 'timeEstimate'
>;

export type QuoteDry = QuoteResponseShort & {
  dry: true;
  deadline?: never;
  depositAddress?: never;
};

export type QuoteReal = QuoteResponseShort & {
  dry: false;
  deadline?: string;
  depositAddress: string;
};

export type Quote = QuoteDry | QuoteReal;

export type FetchQuoteOptions = {
  isRefetch?: boolean;
};
