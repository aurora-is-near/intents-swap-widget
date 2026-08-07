import { renderHook } from '@testing-library/react';
import type { Token } from '@/types/token';
import { EVM_CHAINS } from '@/constants/chains';
import { useSupportedChains } from './useSupportedChains';

const mockUseConfig = jest.fn();
const mockUseUnsafeSnapshot = jest.fn();

jest.mock('@/config', () => ({
  useConfig: () => mockUseConfig(),
}));
jest.mock('@/machine', () => ({
  useUnsafeSnapshot: () => mockUseUnsafeSnapshot(),
}));

const nearToken: Token = {
  assetId: 'nep141:wrap.near',
  blockchain: 'near',
  symbol: 'NEAR',
  decimals: 24,
  price: 0,
  icon: '',
  isIntent: false,
  chainName: 'Near',
  name: 'NEAR',
};

const setContext = (
  walletAddress?: string,
  sourceToken: Token | undefined = undefined,
) => {
  mockUseUnsafeSnapshot.mockReturnValue({
    ctx: { sourceToken, walletAddress },
  });
};

describe('useSupportedChains', () => {
  beforeEach(() => {
    setContext();
    mockUseConfig.mockReturnValue({ connectedWallets: {} });
  });

  it('uses the configured wallet before machine state catches up', () => {
    mockUseConfig.mockReturnValue({
      connectedWallets: { default: 'alice.near' },
    });

    const { result } = renderHook(() => useSupportedChains());

    expect(result.current.supportedChains).toEqual(['near']);
  });

  it('prefers newly configured wallet state over stale machine state', () => {
    setContext('0x0000000000000000000000000000000000000001');
    mockUseConfig.mockReturnValue({
      connectedWallets: { default: 'alice.near' },
    });

    const { result } = renderHook(() => useSupportedChains());

    expect(result.current.supportedChains).toEqual(['near']);
  });

  it('uses a source-chain wallet before the default wallet', () => {
    setContext(undefined, nearToken);
    mockUseConfig.mockReturnValue({
      connectedWallets: {
        default: '0x0000000000000000000000000000000000000001',
        near: 'alice.near',
      },
    });

    const { result } = renderHook(() => useSupportedChains());

    expect(result.current.supportedChains).toEqual(['near']);
  });

  it('keeps an explicit supported-chains override authoritative', () => {
    mockUseConfig.mockReturnValue({
      connectedWallets: { default: 'alice.near' },
      walletSupportedChains: ['sol'],
    });

    const { result } = renderHook(() => useSupportedChains());

    expect(result.current.supportedChains).toEqual(['sol']);
  });

  it('recognizes lowercase 0x wallets as EVM before NEAR', () => {
    mockUseConfig.mockReturnValue({
      connectedWallets: {
        default: '0x0000000000000000000000000000000000000001',
      },
    });

    const { result } = renderHook(() => useSupportedChains());

    expect(result.current.supportedChains).toEqual(EVM_CHAINS);
  });

  it('preserves the disconnected EVM default', () => {
    const { result } = renderHook(() => useSupportedChains());

    expect(result.current.supportedChains).toEqual(EVM_CHAINS);
  });
});
