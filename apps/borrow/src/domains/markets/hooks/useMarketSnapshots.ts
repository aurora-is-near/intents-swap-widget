import { useQueries } from '@tanstack/react-query';
import type { UseQueryResult } from '@tanstack/react-query';

import { useMarketAdapters } from '../providers/MarketAdaptersProvider';
import type { LendingMarket, MarketSnapshot } from '../types';

/** Reserves move slowly; a minute-old read is good enough for the list. */
const MARKET_SNAPSHOT_STALE_TIME_MS = 60_000;

const marketsQueryKey = (adapterId: string) => ['markets', adapterId] as const;

const marketSnapshotQueryKey = (adapterId: string, marketId: string) =>
  ['market-snapshot', adapterId, marketId] as const;

/**
 * A failed snapshot is retried once before it shows as an error: the viem
 * client already retries each RPC call, so more would keep the skeleton up for
 * seconds and hit a rate-limited public RPC many times per read.
 */
const MARKET_SNAPSHOT_RETRY = 1;

/** One market's snapshot read, by status. */
export type MarketSnapshotResult = {
  market: LendingMarket;
  /** Reads this market again, and only this one. */
  refetch: () => void;
} & (
  | { status: 'pending' }
  | { status: 'error' }
  | { status: 'success'; data: MarketSnapshot }
);

const snapshotResult = (
  base: Pick<MarketSnapshotResult, 'market' | 'refetch'>,
  query: UseQueryResult<MarketSnapshot>,
): MarketSnapshotResult => {
  if (query.status === 'pending') {
    return { ...base, status: 'pending' };
  }

  if (query.status === 'error') {
    return { ...base, status: 'error' };
  }

  return { ...base, status: 'success', data: query.data };
};

/** An adapter whose market list could not be read. */
export type MarketListError = {
  adapterId: string;
  refetch: () => void;
};

export type MarketSnapshots = {
  /** One per listed market, in adapter then market order. */
  snapshots: MarketSnapshotResult[];
  /** True while any adapter's market list is still loading. */
  listing: boolean;
  listErrors: MarketListError[];
};

/**
 * Every market of every adapter, each read on its own: one query per market
 * (`['market-snapshot', adapterId, marketId]`, stale after 60 s, retried
 * once), so one chain failing leaves the others' data in place and retries alone.
 */
export const useMarketSnapshots = (): MarketSnapshots => {
  const adapters = useMarketAdapters();

  const lists = useQueries({
    queries: adapters.map((adapter) => ({
      queryKey: marketsQueryKey(adapter.id),
      queryFn: () => adapter.listMarkets(),
      staleTime: MARKET_SNAPSHOT_STALE_TIME_MS,
    })),
  });

  const markets = adapters.flatMap((adapter, index) =>
    (lists[index]?.data ?? []).map((market) => ({ adapter, market })),
  );

  const snapshots = useQueries({
    queries: markets.map(({ adapter, market }) => ({
      queryKey: marketSnapshotQueryKey(adapter.id, market.id),
      queryFn: () => adapter.getMarketSnapshot(market),
      staleTime: MARKET_SNAPSHOT_STALE_TIME_MS,
      retry: MARKET_SNAPSHOT_RETRY,
    })),
  });

  return {
    snapshots: markets.flatMap(({ market }, index) => {
      const query = snapshots[index];

      if (!query) {
        return [];
      }

      return [
        snapshotResult(
          {
            market,
            refetch: () => {
              void query.refetch();
            },
          },
          query,
        ),
      ];
    }),
    listing: lists.some((list) => list.isPending),
    listErrors: adapters.flatMap((adapter, index) => {
      const list = lists[index];

      return list?.error
        ? [
            {
              adapterId: adapter.id,
              refetch: () => {
                void list.refetch();
              },
            },
          ]
        : [];
    }),
  };
};
