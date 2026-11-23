import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { describe, expect, it, type Mock, vi } from 'vitest';

import { MarketAdaptersProvider } from './MarketAdaptersProvider';
import type {
  LendingMarket,
  LendingMarketAdapter,
  MarketSnapshot,
} from './types';
import { useMarketSnapshots } from './useMarketSnapshots';

const market = (chain: string, chainId: number): LendingMarket => ({
  id: `fake:${chain}`,
  provider: 'fake',
  name: 'Fake',
  chain,
  chainId,
  chainLabel: chain.toUpperCase(),
});

const BASE = market('base', 8453);
const ARB = market('arb', 42161);

const snapshotOf = (of: LendingMarket): MarketSnapshot => ({
  market: of,
  blockNumber: 1n,
  baseCurrencyUnit: 100_000_000n,
  collateral: [],
  borrowable: [],
});

const fakeAdapter = (
  overrides: Partial<Pick<LendingMarketAdapter, 'listMarkets'>> = {},
): LendingMarketAdapter & {
  getMarketSnapshot: Mock<LendingMarketAdapter['getMarketSnapshot']>;
} => ({
  id: 'fake',
  name: 'Fake',
  listMarkets: vi.fn().mockResolvedValue([BASE, ARB]),
  getMarketSnapshot: vi.fn(async (of: LendingMarket) => snapshotOf(of)),
  ...overrides,
});

const render = (adapter: LendingMarketAdapter) => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      <MarketAdaptersProvider adapters={[adapter]}>
        {children}
      </MarketAdaptersProvider>
    </QueryClientProvider>
  );

  return {
    queryClient,
    ...renderHook(() => useMarketSnapshots(), { wrapper }),
  };
};

const byId = (
  snapshots: ReturnType<typeof useMarketSnapshots>['snapshots'],
  id: string,
) => snapshots.find(({ market: { id: marketId } }) => marketId === id);

describe('useMarketSnapshots', () => {
  it('reads every listed market under its own key with a 60 s stale time', async () => {
    const adapter = fakeAdapter();
    const { result, queryClient } = render(adapter);

    await waitFor(() =>
      expect(result.current.snapshots.map(({ status }) => status)).toEqual([
        'success',
        'success',
      ]),
    );

    expect(result.current.listing).toBe(false);
    expect(result.current.snapshots.map(({ data }) => data)).toEqual([
      snapshotOf(BASE),
      snapshotOf(ARB),
    ]);

    const query = queryClient.getQueryCache().find({
      queryKey: ['market-snapshot', 'fake', 'fake:base'],
      exact: true,
    });

    expect(query?.state.data).toEqual(snapshotOf(BASE));
    expect(query?.options).toMatchObject({ staleTime: 60_000 });
    expect(
      queryClient.getQueryCache().find({ queryKey: ['markets', 'fake'] })?.state
        .data,
    ).toEqual([BASE, ARB]);
  });

  it('keeps one market’s data when the other fails, and retries only the failed one', async () => {
    const adapter = fakeAdapter();
    let arbFailures = 1;

    adapter.getMarketSnapshot.mockImplementation(async (of) => {
      if (of.id === ARB.id && arbFailures > 0) {
        arbFailures -= 1;
        throw new Error('RPC down');
      }

      return snapshotOf(of);
    });

    const { result } = render(adapter);

    await waitFor(() =>
      expect(byId(result.current.snapshots, ARB.id)?.status).toBe('error'),
    );

    const base = byId(result.current.snapshots, BASE.id);
    const arb = byId(result.current.snapshots, ARB.id);

    expect(base?.status).toBe('success');
    expect(base?.data).toEqual(snapshotOf(BASE));
    expect(arb?.data).toBeUndefined();
    expect(arb?.error).toEqual(new Error('RPC down'));

    act(() => arb?.refetch());

    await waitFor(() =>
      expect(byId(result.current.snapshots, ARB.id)?.status).toBe('success'),
    );

    expect(byId(result.current.snapshots, ARB.id)?.data).toEqual(
      snapshotOf(ARB),
    );
    expect(adapter.getMarketSnapshot.mock.calls.map(([of]) => of.id)).toEqual([
      BASE.id,
      ARB.id,
      ARB.id,
    ]);
  });

  it('reports a failed market list with a retry', async () => {
    const listMarkets = vi
      .fn()
      .mockRejectedValueOnce(new Error('list down'))
      .mockResolvedValue([BASE]);

    const adapter = fakeAdapter({ listMarkets });
    const { result } = render(adapter);

    await waitFor(() => expect(result.current.listErrors).toHaveLength(1));

    expect(result.current.listErrors[0]).toMatchObject({
      adapterId: 'fake',
      error: new Error('list down'),
    });
    expect(result.current.snapshots).toEqual([]);

    act(() => result.current.listErrors[0]?.refetch());

    await waitFor(() =>
      expect(byId(result.current.snapshots, BASE.id)?.status).toBe('success'),
    );

    expect(result.current.listErrors).toEqual([]);
  });

  it('throws outside MarketAdaptersProvider', () => {
    const queryClient = new QueryClient();
    const wrapper = ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );

    vi.spyOn(console, 'error').mockImplementation(() => {});

    expect(() => renderHook(() => useMarketSnapshots(), { wrapper })).toThrow(
      'inside MarketAdaptersProvider',
    );

    vi.mocked(console.error).mockRestore();
  });
});
