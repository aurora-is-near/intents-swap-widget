import { JsonRpcProvider } from 'ethers';
import {
  clearEvmRpcProviderCache,
  getEvmRpcProvider,
} from './getEvmRpcProvider';

const mockDestroy = jest.fn();

jest.mock('ethers', () => ({
  JsonRpcProvider: jest.fn().mockImplementation((rpcUrl: string) => ({
    destroy: mockDestroy,
    rpcUrl,
  })),
}));

const mockJsonRpcProvider = jest.mocked(JsonRpcProvider);

describe('getEvmRpcProvider', () => {
  afterEach(() => {
    clearEvmRpcProviderCache();
  });

  it('reuses a provider for the same RPC URL', () => {
    const first = getEvmRpcProvider('https://eth.example');
    const second = getEvmRpcProvider('https://eth.example');

    expect(first).toBe(second);
    expect(mockJsonRpcProvider).toHaveBeenCalledTimes(1);
  });

  it('creates separate providers for different RPC URLs', () => {
    const ethProvider = getEvmRpcProvider('https://eth.example');
    const auroraProvider = getEvmRpcProvider('https://aurora.example');

    expect(ethProvider).not.toBe(auroraProvider);
    expect(mockJsonRpcProvider).toHaveBeenCalledTimes(2);
  });

  it('destroys cached providers before recreating them', () => {
    const first = getEvmRpcProvider('https://eth.example');

    clearEvmRpcProviderCache();

    const second = getEvmRpcProvider('https://eth.example');

    expect(mockDestroy).toHaveBeenCalledTimes(1);
    expect(first).not.toBe(second);
    expect(mockJsonRpcProvider).toHaveBeenCalledTimes(2);
  });
});
