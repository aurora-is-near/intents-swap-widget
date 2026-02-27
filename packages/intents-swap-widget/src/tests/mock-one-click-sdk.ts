import { jest } from '@jest/globals';
import type { Mock } from 'jest-mock';

import * as OneClickSDK from '@defuse-protocol/one-click-sdk-typescript';
import type {
  CancelablePromise,
  GetExecutionStatusResponse,
  QuoteResponse,
  TokenResponse,
} from '@defuse-protocol/one-click-sdk-typescript';

export const mockOneClickSDK: {
  getTokens: Mock<() => CancelablePromise<TokenResponse[]>>;
  getQuote: Mock<() => CancelablePromise<QuoteResponse>>;
  getExecutionStatus: Mock<() => CancelablePromise<GetExecutionStatusResponse>>;
} = {
  getTokens: jest.fn<() => CancelablePromise<TokenResponse[]>>(),
  getQuote: jest.fn<() => CancelablePromise<QuoteResponse>>(),
  getExecutionStatus:
    jest.fn<() => CancelablePromise<GetExecutionStatusResponse>>(),
};

jest.mock('@defuse-protocol/one-click-sdk-typescript', () => ({
  __esModule: true,
  ...OneClickSDK,
  OneClickService: {
    ...OneClickSDK.OneClickService,
    getExecutionStatus: mockOneClickSDK.getExecutionStatus,
    getTokens: mockOneClickSDK.getTokens,
    getQuote: mockOneClickSDK.getQuote,
  },
}));
