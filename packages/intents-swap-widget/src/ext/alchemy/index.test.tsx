import { createElement } from 'react';
import type { PropsWithChildren } from 'react';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import { fireEvent } from '@/machine';
import { alchemyApi } from '@/network';
import type { Token } from '@/types/token';
import type { WalletAddresses } from '@/types/config';

import { useAlchemyBalanceIntegration } from '.';

const SOL_ADDRESS = '7EcDhSYGxXyscszYEp35KHN8vvw3svAuLKTzXwCFLtV';
const SOL_BALANCE_KEY = 'nep141:sol.omft.near-sol';

const solToken: Token = {
  assetId: 'nep141:sol.omft.near',
  symbol: 'SOL',
  name: 'Solana',
  decimals: 9,
  price: 150,
  blockchain: 'sol',
  chainName: 'Solana',
  icon: '',
  isIntent: false,
};

const mockCtx: Record<string, unknown> = {};

jest.mock('@/network', () => ({ alchemyApi: { post: jest.fn() } }));
jest.mock('@/config', () => ({ useConfig: () => ({}) }));
jest.mock('@/machine', () => ({ fireEvent: jest.fn() }));
jest.mock('@/machine/snap', () => ({
  useUnsafeSnapshot: () => ({ ctx: mockCtx }),
}));
jest.mock('@/hooks/useTokens', () => ({
  useTokens: () => ({ tokens: [solToken] }),
}));

const mockPost = alchemyApi.post as jest.Mock;

const renderIntegration = (connectedWallets: WalletAddresses) => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  const wrapper = ({ children }: PropsWithChildren) =>
    createElement(QueryClientProvider, { client: queryClient }, children);

  renderHook(
    () =>
      useAlchemyBalanceIntegration({
        isEnabled: true,
        alchemyApiKey: 'key',
        connectedWallets,
      }),
    { wrapper },
  );

  return () => queryClient.getQueryData(['walletBalances', connectedWallets]);
};

describe('useAlchemyBalanceIntegration', () => {
  const connectedWallets: WalletAddresses = { sol: SOL_ADDRESS };

  beforeEach(() => {
    jest.clearAllMocks();

    Object.assign(mockCtx, {
      walletAddress: SOL_ADDRESS,
      sourceToken: solToken,
      targetToken: undefined,
      sourceTokenAmount: '',
      quote: undefined,
      quoteStatus: 'idle',
      transferStatus: { status: 'idle' },
    });

    mockPost.mockResolvedValue({
      data: {
        data: {
          pageKey: null,
          tokens: [
            {
              network: 'solana-mainnet',
              tokenAddress: null,
              tokenBalance: '0x3b9aca00',
            },
          ],
        },
      },
    });
  });

  it('queries Solana for a chain-keyed wallet and sets the source token balance', async () => {
    const getWalletBalances = renderIntegration(connectedWallets);

    await waitFor(() =>
      expect(getWalletBalances()).toEqual({ [SOL_BALANCE_KEY]: '1000000000' }),
    );

    expect(mockPost.mock.calls[0]?.[1]).toMatchObject({
      addresses: [{ address: SOL_ADDRESS, networks: ['solana-mainnet'] }],
    });

    expect(fireEvent).toHaveBeenCalledWith('tokenSetBalance', '1000000000');
  });

  it('stores balances once the machine has left initial_wallet', async () => {
    Object.assign(mockCtx, { quote: {}, quoteStatus: 'success' });

    const getWalletBalances = renderIntegration(connectedWallets);

    await waitFor(() =>
      expect(getWalletBalances()).toEqual({ [SOL_BALANCE_KEY]: '1000000000' }),
    );

    expect(fireEvent).not.toHaveBeenCalled();
  });
});
