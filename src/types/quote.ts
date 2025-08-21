import type { QuoteResponse } from '@defuse-protocol/one-click-sdk-typescript';

export type QuoteDry = Omit<
  QuoteResponse['quote'],
  'deadline' | 'depositAddress'
> & {
  dry: true;
  deadline?: never;
  depositAddress?: never;
};

export type QuoteReal = Omit<
  QuoteResponse['quote'],
  'deadline' | 'depositAddress'
> & {
  dry: false;
  deadline: string;
  depositAddress: string;
};

export type Quote = QuoteDry | QuoteReal;
