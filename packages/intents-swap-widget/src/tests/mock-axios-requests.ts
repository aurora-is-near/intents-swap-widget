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

export const mockOneClickApi: {
  post: Mock<(...args: Args) => Promise<{ data: QuoteResponse }>>;
} = {
  post: jest.fn<(...args: Args) => Promise<{ data: QuoteResponse }>>(),
};

jest.mock('../network', () => ({
  __esModule: true,
  alchemyApi: mockAlchemyApi,
  oneClickApi: mockOneClickApi,
}));
