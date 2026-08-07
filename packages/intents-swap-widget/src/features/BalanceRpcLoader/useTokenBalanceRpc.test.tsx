import { createElement } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import type { Token } from '@/types/token';
import type { WalletAddresses } from '@/types/config';
import { useTokenBalanceRpc } from './useTokenBalanceRpc';

const mockUseWalletAddressForToken = jest.fn();
const mockGetEvmMainTokenBalance = jest.fn();

jest.mock('@/config', () => ({
  useConfig: () => ({}),
}));
jest.mock('@/hooks/useSupportedChains', () => ({
  useSupportedChains: () => ({ supportedChains: ['eth'] }),
}));
jest.mock('@/hooks/useWalletAddressForToken', () => ({
  useWalletAddressForToken: () => mockUseWalletAddressForToken(),
}));
jest.mock('@/utils/evm/getEvmMainTokenBalance', () => ({
  getEvmMainTokenBalance: (...args: unknown[]) =>
    mockGetEvmMainTokenBalance(...args),
}));
jest.mock('@/utils/evm/getEvmTokenBalance', () => ({
  getEvmTokenBalance: jest.fn(),
}));
jest.mock('@/utils/near/getNativeNearBalance', () => ({
  getNativeNearBalance: jest.fn(),
}));
jest.mock('@/utils/near/getNearTokenBalance', () => ({
  getNearTokenBalance: jest.fn(),
}));
jest.mock('@/utils/near/rpc', () => ({
  buildNearRpcUrls: jest.fn(() => []),
}));
jest.mock('@/utils/solana/getSolanaTokenBalance', () => ({
  getSolanaTokenBalance: jest.fn(),
}));
jest.mock('@/utils/ton/getTonTokenBalance', () => ({
  getTonTokenBalance: jest.fn(),
}));

const ethToken: Token = {
  assetId: 'nep141:eth.omft.near',
  blockchain: 'eth',
  symbol: 'ETH',
  decimals: 18,
  price: 0,
  icon: '',
  isIntent: false,
  chainName: 'Ethereum',
  name: 'Ether',
};

const renderBalance = (connectedWallets: WalletAddresses) => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  return renderHook(
    () =>
      useTokenBalanceRpc({
        connectedWallets,
        rpcs: { eth: ['https://eth.example'] },
        token: ethToken,
      }),
    {
      wrapper: ({ children }) =>
        createElement(QueryClientProvider, { client: queryClient }, children),
    },
  );
};

describe('useTokenBalanceRpc', () => {
  beforeEach(() => {
    mockGetEvmMainTokenBalance.mockResolvedValue('1');
  });

  it('does not send a NEAR account to an EVM RPC during stale chain state', () => {
    mockUseWalletAddressForToken.mockReturnValue({
      walletAddress: 'alice.near',
    });

    const { result } = renderBalance({ default: 'alice.near' });

    expect(result.current.fetchStatus).toBe('idle');
    expect(mockGetEvmMainTokenBalance).not.toHaveBeenCalled();
  });

  it('loads an EVM balance for a compatible address', async () => {
    const walletAddress = '0x0000000000000000000000000000000000000001';

    mockUseWalletAddressForToken.mockReturnValue({ walletAddress });

    const { result } = renderBalance({ default: walletAddress });

    await waitFor(() => expect(result.current.data).toBe('1'));

    expect(mockGetEvmMainTokenBalance).toHaveBeenCalledWith(
      walletAddress,
      'https://eth.example',
    );
  });
});
