import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import { describe, expect, expectTypeOf, it, vi } from 'vitest';
import type { ReactNode } from 'react';

import {
  FAKE_ARB as ARB,
  FAKE_BASE as BASE,
  createFakeAdapter,
  createTestQueryClient,
  pairSnapshot as snapshotOf,
} from '@/tests/fakeMarkets';

import { MarketAdaptersProvider } from '../../providers/MarketAdaptersProvider';
import { useMarketSnapshots } from '../useMarketSnapshots';
import type { LendingMarketAdapter, MarketSnapshot } from '../../types';
import type { MarketSnapshotResult } from '../useMarketSnapshots';

/** Every market reads `snapshotOf` it, unless a test says otherwise. */
const fakeAdapter = (
  overrides: Partial<Pick<LendingMarketAdapter, 'listMarkets'>> = {},
) =>
  createFakeAdapter({
    ...overrides,
    getMarketSnapshot: async (of) => snapshotOf(of),
  });

const render = (adapter: LendingMarketAdapter) => {
  // The snapshot queries set their own retry; it runs without delay here.
  const queryClient = createTestQueryClient();

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

/** A result's snapshot, which only a successful read has. */
const dataOf = (result: MarketSnapshotResult | undefined) =>
  result?.status === 'success' ? result.data : undefined;

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
    expect(result.current.snapshots.map(dataOf)).toEqual([
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
    // The first read and its one retry.
    let arbFailures = 2;

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
    expect(dataOf(base)).toEqual(snapshotOf(BASE));

    act(() => arb?.refetch());

    await waitFor(() =>
      expect(byId(result.current.snapshots, ARB.id)?.status).toBe('success'),
    );

    expect(dataOf(byId(result.current.snapshots, ARB.id))).toEqual(
      snapshotOf(ARB),
    );
    expect(adapter.getMarketSnapshot.mock.calls.map(([of]) => of.id)).toEqual([
      BASE.id,
      ARB.id,
      ARB.id,
      ARB.id,
    ]);
  });

  it('retries a failing market once before showing the error', async () => {
    const adapter = fakeAdapter();

    adapter.getMarketSnapshot.mockImplementation(async (of) => {
      if (of.id === ARB.id) {
        throw new Error('429 Too Many Requests');
      }

      return snapshotOf(of);
    });

    const { result, queryClient } = render(adapter);

    await waitFor(() =>
      expect(byId(result.current.snapshots, ARB.id)?.status).toBe('error'),
    );

    expect(
      adapter.getMarketSnapshot.mock.calls.filter(([of]) => of.id === ARB.id),
    ).toHaveLength(2);
    expect(
      queryClient
        .getQueryCache()
        .find({ queryKey: ['market-snapshot', 'fake', ARB.id], exact: true })
        ?.options,
    ).toMatchObject({ retry: 1 });
  });

  it('types the result by status', () => {
    type Result = ReturnType<typeof useMarketSnapshots>['snapshots'][number];

    expectTypeOf<
      Extract<Result, { status: 'success' }>['data']
    >().toEqualTypeOf<MarketSnapshot>();
    expectTypeOf<Extract<Result, { status: 'error' }>>().not.toHaveProperty(
      'data',
    );
  });

  it('reports a failed market list with a retry', async () => {
    const listMarkets = vi
      .fn()
      .mockRejectedValueOnce(new Error('list down'))
      .mockResolvedValue([BASE]);

    const adapter = fakeAdapter({ listMarkets });
    const { result } = render(adapter);

    await waitFor(() => expect(result.current.listErrors).toHaveLength(1));

    expect(result.current.listErrors[0]).toMatchObject({ adapterId: 'fake' });
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
