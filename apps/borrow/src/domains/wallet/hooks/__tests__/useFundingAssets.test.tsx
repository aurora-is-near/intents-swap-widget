import { renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, expectTypeOf, it, vi } from 'vitest';
import type {
  UseSupportedTokensResult,
  UseWalletBalancesResult,
} from '@aurora-is-near/intents-connect/react';

import { useFundingAssets } from '../useFundingAssets';
import type { FundingAssets } from '../../types';

const ETH = {
  assetId: 'nep141:eth.omft.near',
  symbol: 'ETH',
  blockchain: 'eth',
  decimals: 18,
  price: 3000,
};

const MEME = {
  assetId: 'nep141:base-meme.omft.near',
  symbol: 'MEME',
  blockchain: 'base',
  decimals: 18,
  contractAddress: '0x0000000000000000000000000000000000000001',
  price: 0.5,
};

// Filled before each test.
const mocks = vi.hoisted(
  () =>
    ({}) as {
      wallet: UseWalletBalancesResult;
      supported: UseSupportedTokensResult;
    },
);

vi.mock('@aurora-is-near/intents-connect/react', () => ({
  useWalletBalances: () => mocks.wallet,
  useSupportedTokens: () => mocks.supported,
}));

beforeEach(() => {
  mocks.wallet = {
    balances: {
      [MEME.assetId]: '1000000000000000000',
      [ETH.assetId]: '1000000000000000000',
    },
    errors: { sol: new Error('rpc refused') },
    tokens: [ETH, MEME],
    status: 'success',
    refresh: vi.fn(() => Promise.resolve()),
  };
  mocks.supported = {
    origins: [{ assetId: ETH.assetId }],
    destinations: [],
    status: 'success',
    refresh: vi.fn(() => Promise.resolve()),
  };
});

describe('useFundingAssets', () => {
  it('returns the wallet rows, unread chains and status', () => {
    const { result } = renderHook(() => useFundingAssets());

    expectTypeOf(result.current).toEqualTypeOf<FundingAssets>();

    expect(result.current.status).toBe('ready');
    expect(result.current.unreadChains).toEqual(['sol']);
    expect(result.current.rows).toEqual([
      expect.objectContaining({
        symbol: 'ETH',
        amount: 10n ** 18n,
        usdValue: 3000,
        unavailableReason: undefined,
      }),
      expect.objectContaining({
        symbol: 'MEME',
        usdValue: 0.5,
        unavailableReason: 'Not supported yet',
      }),
    ]);
  });

  it('marks nothing unavailable until the supported tokens load', () => {
    mocks.supported = { ...mocks.supported, status: 'loading', origins: [] };

    const { result } = renderHook(() => useFundingAssets());

    expect(
      result.current.rows.every((row) => row.unavailableReason === undefined),
    ).toBe(true);
  });

  it.each([
    ['idle', 'idle'],
    ['loading', 'loading'],
    ['error', 'error'],
  ] as const)('maps the wallet status %s to %s', (from, to) => {
    mocks.wallet = { ...mocks.wallet, status: from };

    const { result } = renderHook(() => useFundingAssets());

    expect(result.current.status).toBe(to);
  });

  it('refresh reads the wallet balances again', () => {
    const { result } = renderHook(() => useFundingAssets());

    result.current.refresh();

    expect(mocks.wallet.refresh).toHaveBeenCalledOnce();
  });
});
