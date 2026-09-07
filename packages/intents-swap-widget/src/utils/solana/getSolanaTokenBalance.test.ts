import type { Token } from '../../types';

import { getSolanaTokenBalance } from './getSolanaTokenBalance';

const WALLET_ADDRESS = 'DRpbCBMxVnDK7maPM5tGv6MvB3v1sRMC86PZ8okm21hy';

const makeToken = (overrides: Partial<Token>): Token => ({
  assetId: 'nep141:sol.omft.near',
  symbol: 'SOL',
  decimals: 9,
  price: 1,
  blockchain: 'sol',
  icon: '',
  contractAddress: undefined,
  isIntent: false,
  chainName: 'Solana',
  name: 'Solana',
  ...overrides,
});

const mockFetch = jest.fn<Promise<Response>, Parameters<typeof fetch>>();

const jsonResponse = (body: unknown) =>
  Promise.resolve({ json: () => Promise.resolve(body) } as Response);

describe('getSolanaTokenBalance', () => {
  beforeEach(() => {
    mockFetch.mockReset();
    global.fetch = mockFetch;
  });

  it('returns the native balance from the first working RPC', async () => {
    mockFetch.mockImplementation(() =>
      jsonResponse({ jsonrpc: '2.0', id: 1, result: { value: 5000 } }),
    );

    await expect(
      getSolanaTokenBalance(makeToken({}), WALLET_ADDRESS, [
        'https://rpc-one.example.com',
        'https://rpc-two.example.com',
      ]),
    ).resolves.toBe('5000');

    expect(mockFetch).toHaveBeenCalledTimes(1);
    expect(mockFetch).toHaveBeenCalledWith(
      'https://rpc-one.example.com',
      expect.anything(),
    );
  });

  it('fails over to the next RPC when the first one errors', async () => {
    mockFetch
      .mockImplementationOnce(() => Promise.reject(new Error('rate limited')))
      .mockImplementationOnce(() =>
        jsonResponse({ jsonrpc: '2.0', id: 1, result: { value: 5000 } }),
      );

    await expect(
      getSolanaTokenBalance(makeToken({}), WALLET_ADDRESS, [
        'https://rpc-one.example.com',
        'https://rpc-two.example.com',
      ]),
    ).resolves.toBe('5000');

    expect(mockFetch).toHaveBeenCalledTimes(2);
    expect(mockFetch).toHaveBeenLastCalledWith(
      'https://rpc-two.example.com',
      expect.anything(),
    );
  });

  it('returns null when every RPC fails', async () => {
    mockFetch.mockImplementation(() => Promise.reject(new Error('down')));

    await expect(
      getSolanaTokenBalance(makeToken({}), WALLET_ADDRESS, [
        'https://rpc-one.example.com',
        'https://rpc-two.example.com',
      ]),
    ).resolves.toBeNull();

    expect(mockFetch).toHaveBeenCalledTimes(2);
  });

  it('returns null without querying for an SPL token with no contract address', async () => {
    await expect(
      getSolanaTokenBalance(
        makeToken({ symbol: 'USDC', contractAddress: undefined }),
        WALLET_ADDRESS,
        ['https://rpc-one.example.com'],
      ),
    ).resolves.toBeNull();

    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('returns null for a non-Solana wallet address', async () => {
    await expect(
      getSolanaTokenBalance(
        makeToken({}),
        '0x0000000000000000000000000000000000000000',
        ['https://rpc-one.example.com'],
      ),
    ).resolves.toBeNull();

    expect(mockFetch).not.toHaveBeenCalled();
  });
});
