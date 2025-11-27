import { jest } from '@jest/globals';

export const mockEvmWallet: {
  rpcTimeoutDuration: number;
  on: jest.Mock;
  removeListener: jest.Mock;
  request: jest.Mock<
    ({ method }: { method: string }) => Promise<string | string[]>
  >;
} = {
  rpcTimeoutDuration: 100,
  on: jest.fn(() => undefined),
  removeListener: jest.fn(() => undefined),
  request: jest.fn(async ({ method }: { method: string }) => {
    if (method === 'eth_chainId') {
      return Promise.resolve('0x1');
    }

    if (method === 'eth_requestAccounts') {
      return Promise.resolve(['0xMockAccount']);
    }

    if (method === 'eth_getBalance') {
      return Promise.resolve('0xDe0B6B3A576190900000');
    }

    // Add more mocks for other methods as needed
    return Promise.reject(new Error(`Method not supported: ${method}`));
  }),
};
