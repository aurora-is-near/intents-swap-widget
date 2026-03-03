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
  type: 'QUOTE_DRY_WITH_AMOUNT';
  dry: true;
  deadline?: never;
  depositAddress?: never;
};

export type QuoteReal = QuoteResponseShort & {
  type: 'QUOTE_REAL_WITH_AMOUNT';
  dry: false;
  deadline?: string;
  depositAddress: string;
};

export type QuoteDepositAnyAmount = {
  type: 'QUOTE_DEPOSIT_ANY_AMOUNT';
  depositAddress: string;
  deadline: string;
  timeEstimate: number;
  dry: boolean;
};

export type Quote = QuoteDry | QuoteReal | QuoteDepositAnyAmount;

export type FetchQuoteOptions = {
  isRefetch?: boolean;
  signal?: AbortSignal;
};
