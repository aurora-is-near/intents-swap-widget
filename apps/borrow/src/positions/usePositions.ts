import { useQueries, type UseQueryResult } from '@tanstack/react-query';

import { AAVE_V3_ADAPTER_ID } from '../markets/aaveV3';
import { useMarketAdapters } from '../markets/MarketAdaptersProvider';
import type { LendingMarket } from '../markets/types';
import {
  MARKET_SNAPSHOT_STALE_TIME_MS,
  marketsQueryKey,
} from '../markets/useMarketSnapshots';
import { usePositionsReader } from './PositionsReaderProvider';
import { POSITIONS_QUERY_KEY } from './refreshPositions';
import type { LoanPosition, PositionMarketRisk } from './types';
import { useOwnerAccounts } from './useOwnerAccounts';

/** Positions are read again every minute while shown. */
export const POSITIONS_REFETCH_INTERVAL_MS = 60_000;

/**
 * A read younger than this is served from the cache, such as when several
 * screens mount the hook or the window is focused right after a read.
 */
export const POSITIONS_STALE_TIME_MS = 30_000;

/** Liquidation thresholds and rates move slowly: read once an hour. */
export const POSITION_MARKET_RISK_STALE_TIME_MS = 60 * 60_000;

export const ownerPositionsQueryKey = (owner: string) =>
  [...POSITIONS_QUERY_KEY, 'owner', owner] as const;

export const marketPositionQueryKey = (owner: string, marketId: string) =>
  [...POSITIONS_QUERY_KEY, 'market', owner, marketId] as const;

/**
 * Outside `positions`: refreshing the positions after a borrow must not read
 * the market data again.
 */
export const positionMarketRiskQueryKey = (network: string, marketId: string) =>
  ['position-market-risk', network, marketId] as const;

/** Chains of Borrow's own markets, where a repaid loan can sit. */
const BORROW_CHAINS: ReadonlySet<string> = new Set(['base', 'arb']);

/** One of Borrow's markets: Aave V3 on Base or Arbitrum. */
export const isBorrowMarket = (market: LendingMarket) =>
  market.provider === AAVE_V3_ADAPTER_ID && BORROW_CHAINS.has(market.chain);

/** A read that failed; loaded positions stay. */
export type PositionsReadError = {
  /** What could not be read. */
  read:
    | 'intermediary'
    | 'markets'
    | 'owner-positions'
    | 'market-position'
    | 'market-risk';
  /** The account read, when the read was for one. */
  owner?: string;
  /** The market read, when the read was for one. */
  marketId?: string;
  error: Error;
};

export type PositionsTotals = {
  debtUsd: number;
  collateralUsd: number;
};

export type UsePositionsResult = {
  /** The accounts read (`useOwnerAccounts`). */
  owners: readonly string[];
  /** Every loan of every owner, deduplicated by `id`. */
  positions: LoanPosition[];
  totals: PositionsTotals;
  /** Listed positions, repaid included. */
  count: number;
  /** Something is still on its first read. */
  isLoading: boolean;
  errors: PositionsReadError[];
  /** Reads everything again. */
  refetch: () => void;
};

/** A risk figure the position lacks is taken from its market's. */
export const withMarketRisk = (
  position: LoanPosition,
  risk: PositionMarketRisk | undefined,
): LoanPosition =>
  risk
    ? {
        ...position,
        liquidationLtv: position.liquidationLtv ?? risk.liquidationLtv,
        borrowApr: position.borrowApr ?? risk.borrowApr,
      }
    : position;

/** Lacks a figure its market's data has. */
const needsMarketRisk = (position: LoanPosition) =>
  position.liquidationLtv === null ||
  (position.borrowApr === null && position.debtUsd > 0);

/** The first of each `id`, in order. */
export const dedupePositions = (positions: readonly LoanPosition[]) => {
  const seen = new Set<string>();

  return positions.filter(({ id }) => {
    if (seen.has(id)) {
      return false;
    }

    seen.add(id);

    return true;
  });
};

export const positionsTotals = (
  positions: readonly LoanPosition[],
): PositionsTotals =>
  positions.reduce(
    (totals, { debtUsd, collateralUsd }) => ({
      debtUsd: totals.debtUsd + debtUsd,
      collateralUsd: totals.collateralUsd + collateralUsd,
    }),
    { debtUsd: 0, collateralUsd: 0 },
  );

/** Still on its first read: no data yet, and not failed. */
const loading = (query: UseQueryResult) =>
  query.isPending && query.fetchStatus !== 'idle';

const refetchAll = (queries: readonly UseQueryResult[]) => {
  queries.forEach((query) => {
    void query.refetch();
  });
};

/**
 * The connected wallet's loans (`useOwnerAccounts`), read through the
 * `PositionsReader`:
 * - one wallet-wide read per owner, `['positions', 'owner', owner]`;
 * - for the intermediary only, one read per Borrow market (Aave V3 on Base
 *   and Arbitrum, from the live market list),
 *   `['positions', 'market', owner, marketId]`: the wallet-wide list leaves
 *   out loans with no debt, so a repaid loan is found only there;
 * - a position lacking a risk figure takes it from its market's data,
 *   `['position-market-risk', network, marketId]`, read once an hour.
 *
 * Positions are read every 60 s and on window focus, merged and deduplicated
 * by `id`. A failed read is listed in `errors` and leaves what loaded, and
 * what an earlier read loaded, in place.
 */
export const usePositions = (): UsePositionsResult => {
  const reader = usePositionsReader();
  const adapters = useMarketAdapters();
  const accounts = useOwnerAccounts({ enabled: reader !== null });
  const { owners, intermediary } = accounts;
  const borrowAdapters = adapters.filter(({ id }) => id === AAVE_V3_ADAPTER_ID);

  const lists = useQueries({
    queries: borrowAdapters.map((adapter) => ({
      queryKey: marketsQueryKey(adapter.id),
      queryFn: () => adapter.listMarkets(),
      staleTime: MARKET_SNAPSHOT_STALE_TIME_MS,
      enabled: reader !== null && intermediary !== undefined,
    })),
  });

  const borrowMarkets = lists
    .flatMap(({ data }) => data ?? [])
    .filter(isBorrowMarket);

  const ownerQueries = useQueries({
    queries: owners.map((owner) => ({
      queryKey: ownerPositionsQueryKey(owner),
      queryFn: () => {
        if (!reader) {
          throw new Error('No positions reader');
        }

        return reader.readOwnerPositions(owner);
      },
      enabled: reader !== null,
      staleTime: POSITIONS_STALE_TIME_MS,
      refetchInterval: POSITIONS_REFETCH_INTERVAL_MS,
      refetchOnWindowFocus: true,
    })),
  });

  const repaidReads =
    intermediary === undefined
      ? []
      : borrowMarkets.map((market) => ({ owner: intermediary, market }));

  const marketQueries = useQueries({
    queries: repaidReads.map(({ owner, market }) => ({
      queryKey: marketPositionQueryKey(owner, market.id),
      queryFn: () => {
        if (!reader) {
          throw new Error('No positions reader');
        }

        return reader.readMarketPosition(owner, market);
      },
      enabled: reader !== null,
      staleTime: POSITIONS_STALE_TIME_MS,
      refetchInterval: POSITIONS_REFETCH_INTERVAL_MS,
      refetchOnWindowFocus: true,
    })),
  });

  const read = dedupePositions([
    ...ownerQueries.flatMap(({ data }) => data ?? []),
    ...marketQueries.flatMap(({ data }) => (data ? [data] : [])),
  ]);

  const riskMarkets = read
    .filter(needsMarketRisk)
    .map(({ network, marketId }) => ({ network, marketId }))
    .filter(
      (market, index, all) =>
        all.findIndex(
          ({ network, marketId }) =>
            network === market.network && marketId === market.marketId,
        ) === index,
    );

  const riskQueries = useQueries({
    queries: riskMarkets.map((market) => ({
      queryKey: positionMarketRiskQueryKey(market.network, market.marketId),
      queryFn: () => {
        if (!reader) {
          throw new Error('No positions reader');
        }

        return reader.readMarketRisk(market);
      },
      enabled: reader !== null,
      staleTime: POSITION_MARKET_RISK_STALE_TIME_MS,
    })),
  });

  const riskOf = (position: LoanPosition) => {
    const index = riskMarkets.findIndex(
      ({ network, marketId }) =>
        network === position.network && marketId === position.marketId,
    );

    return index === -1 ? undefined : riskQueries[index]?.data;
  };

  const positions = read.map((position) =>
    needsMarketRisk(position)
      ? withMarketRisk(position, riskOf(position))
      : position,
  );

  const errors: PositionsReadError[] = [
    ...(accounts.error
      ? [{ read: 'intermediary' as const, error: accounts.error }]
      : []),
    ...lists.flatMap(({ error }) =>
      error ? [{ read: 'markets' as const, error }] : [],
    ),
    ...owners.flatMap((owner, index) => {
      const error = ownerQueries[index]?.error;

      return error ? [{ read: 'owner-positions' as const, owner, error }] : [];
    }),
    ...repaidReads.flatMap(({ owner, market }, index) => {
      const error = marketQueries[index]?.error;

      return error
        ? [
            {
              read: 'market-position' as const,
              owner,
              marketId: market.id,
              error,
            },
          ]
        : [];
    }),
    ...riskMarkets.flatMap(({ marketId }, index) => {
      const error = riskQueries[index]?.error;

      return error ? [{ read: 'market-risk' as const, marketId, error }] : [];
    }),
  ];

  return {
    owners,
    positions,
    totals: positionsTotals(positions),
    count: positions.length,
    isLoading:
      accounts.isLoading ||
      [...lists, ...ownerQueries, ...marketQueries].some(loading),
    errors,
    refetch: () => {
      if (accounts.error) {
        accounts.refetch();
      }

      // The positions every time; the slow-moving reads only when they failed.
      refetchAll([
        ...ownerQueries,
        ...marketQueries,
        ...lists.filter(({ error }) => error),
        ...riskQueries.filter(({ error }) => error),
      ]);
    },
  };
};
