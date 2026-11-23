import { useQueries } from '@tanstack/react-query';

import { useMarketAdapters } from './MarketAdaptersProvider';
import type { LendingMarket, MarketSnapshot } from './types';

/** Reserves move slowly; a minute-old read is good enough for the list. */
export const MARKET_SNAPSHOT_STALE_TIME_MS = 60_000;

export const marketsQueryKey = (adapterId: string) =>
  ['markets', adapterId] as const;

export const marketSnapshotQueryKey = (adapterId: string, marketId: string) =>
  ['market-snapshot', adapterId, marketId] as const;

/** One market's snapshot read. */
export type MarketSnapshotResult = {
  adapterId: string;
  market: LendingMarket;
  status: 'pending' | 'error' | 'success';
  /** The last good snapshot; kept while a refetch runs. */
  data: MarketSnapshot | undefined;
  error: Error | null;
  /** Reads this market again, and only this one. */
  refetch: () => void;
};

/** An adapter whose market list could not be read. */
export type MarketListError = {
  adapterId: string;
  error: Error;
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
 * (`['market-snapshot', adapterId, marketId]`, stale after 60 s), so one chain
 * failing leaves the others' data in place and retries alone.
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
    })),
  });

  return {
    snapshots: markets.flatMap(({ adapter, market }, index) => {
      const query = snapshots[index];

      if (!query) {
        return [];
      }

      return [
        {
          adapterId: adapter.id,
          market,
          status: query.status,
          data: query.data,
          error: query.error,
          refetch: () => {
            void query.refetch();
          },
        },
      ];
    }),
    listing: lists.some((list) => list.isPending),
    listErrors: adapters.flatMap((adapter, index) => {
      const list = lists[index];

      return list?.error
        ? [
            {
              adapterId: adapter.id,
              error: list.error,
              refetch: () => {
                void list.refetch();
              },
            },
          ]
        : [];
    }),
  };
};
