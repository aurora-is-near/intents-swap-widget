import { jest } from '@jest/globals';
import type { Mock } from 'jest-mock';

import * as OneClickSDK from '@defuse-protocol/one-click-sdk-typescript';
import type {
  CancelablePromise,
  QuoteResponse,
  TokenResponse,
} from '@defuse-protocol/one-click-sdk-typescript';

export const mockOneClickSDK: {
  getTokens: Mock<() => CancelablePromise<TokenResponse[]>>;
  getQuote: Mock<() => CancelablePromise<QuoteResponse>>;
} = {
  getTokens: jest.fn<() => CancelablePromise<TokenResponse[]>>(),
  getQuote: jest.fn<() => CancelablePromise<QuoteResponse>>(),
};

jest.mock('@defuse-protocol/one-click-sdk-typescript', () => ({
  __esModule: true,
  ...OneClickSDK,
  OneClickService: {
    ...OneClickSDK.OneClickService,
    getTokens: mockOneClickSDK.getTokens,
    getQuote: mockOneClickSDK.getQuote,
  },
}));
