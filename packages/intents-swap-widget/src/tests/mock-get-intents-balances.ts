import { jest } from '@jest/globals';
import type { Mock } from 'jest-mock';

import type { TokenBalance } from '@/types/token';

export const mockGetIntentsBalances: Mock<
  () => Promise<Record<string, TokenBalance>>
> = jest.fn<() => Promise<Record<string, TokenBalance>>>();

jest.mock('@/utils/intents/getIntentsBalance', () => ({
  __esModule: true,
  getIntentsBalances: mockGetIntentsBalances,
}));
