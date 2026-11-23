import { jest } from '@jest/globals';
import type { Mock } from 'jest-mock';
import type { AxiosRequestConfig } from 'axios';
import type { QuoteResponse } from '@defuse-protocol/one-click-sdk-typescript';

import type { AlchemyBalanceItem } from '@/ext/alchemy/types';

type Return = {
  data: {
    data: {
      pageKey: string | null;
      tokens: AlchemyBalanceItem[];
    };
  };
};

type Args = [string, unknown, AxiosRequestConfig<unknown>];

export const mockAlchemyApi: {
  post: Mock<(...args: Args) => Promise<Return>>;
} = {
  post: jest.fn<(...args: Args) => Promise<Return>>(),
};

export const mockFeeServiceApi: {
  post: Mock<(...args: Args) => Promise<{ data: QuoteResponse }>>;
  get: Mock<(url: string) => Promise<{ data: unknown }>>;
} = {
  post: jest.fn<(...args: Args) => Promise<{ data: QuoteResponse }>>(),
  get: jest.fn<(url: string) => Promise<{ data: unknown }>>(),
};

// Mocked quotes aren't signed by 1Click, so trust them unless a test says not.
export const mockIsQuoteSignatureValid: Mock<() => boolean> = jest.fn(
  () => true,
);

jest.mock('../utils/intents/isQuoteSignatureValid', () => ({
  __esModule: true,
  isQuoteSignatureValid: mockIsQuoteSignatureValid,
}));

jest.mock('../network', () => ({
  __esModule: true,
  alchemyApi: mockAlchemyApi,
  feeServiceApi: mockFeeServiceApi,
  getIntentsApiBaseUrl: () => 'https://intents-api.aurora.dev',
}));
