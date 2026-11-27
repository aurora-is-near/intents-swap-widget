import { useQueries } from '@tanstack/react-query';
import type { UseQueryResult } from '@tanstack/react-query';

import { needsMarketRisk, withMarketRisk } from '../model/marketRisk';
import { usePositionsReader } from '../providers/PositionsReaderProvider';
import { useOwnerAccounts } from './useOwnerAccounts';
import type {
  LoanPosition,
  PositionMarketRef,
  PositionMarketRisk,
} from '../types';

/** Every positions read sits under this key, so one call refreshes them all. */
export const POSITIONS_QUERY_KEY = ['positions'] as const;

const ownerPositionsQueryKey = (owner: string) =>
  [...POSITIONS_QUERY_KEY, 'owner', owner] as const;

const marketPositionQueryKey = (owner: string, market: PositionMarketRef) =>
  [
    ...POSITIONS_QUERY_KEY,
    'market',
    owner,
    market.network,
    market.marketId,
  ] as const;

/** One market of one network, as a map key. */
const marketKey = ({ network, marketId }: PositionMarketRef) =>
  `${network}:${marketId}`;

const marketRiskQueryKey = (market: PositionMarketRef) =>
  ['position-market-risk', market.network, market.marketId] as const;

/**
 * A read stays fresh for 30 s and is read again every minute while the page
 * is open, and on focus: loans move with prices, and each read spends
 * vaults.fyi credits.
 */
const POSITIONS_STALE_TIME_MS = 30_000;
const POSITIONS_REFETCH_INTERVAL_MS = 60_000;

/** Thresholds and rates move slowly; an hour-old read is good enough. */
const MARKET_RISK_STALE_TIME_MS = 60 * 60_000;

/**
 * A failed read is retried once, unless the source refused it (a 4xx, such as
 * a bad path or no credits left): asking again only spends credits.
 */
const retryRead = (failures: number, error: unknown) => {
  const status = (error as { status?: unknown } | null)?.status;

  return (
    failures < 1 &&
    !(typeof status === 'number' && status >= 400 && status < 500)
  );
};

/** What every loan read (an owner's, or one market's) is read with. */
const POSITIONS_READ_OPTIONS = {
  retry: retryRead,
  staleTime: POSITIONS_STALE_TIME_MS,
  refetchInterval: POSITIONS_REFETCH_INTERVAL_MS,
};

export type Positions = {
  /**
   * - `idle`: no wallet.
   * - `pending`: nothing read yet.
   * - `error`: every read failed and nothing is known.
   * - `success`: `positions` holds what was read; `partial` says some reads
   *   failed (or the last refetch did) and the list may be incomplete.
   */
  status: 'idle' | 'pending' | 'error' | 'success';
  /** Loans with debt first, as read, then repaid ones. */
  positions: LoanPosition[];
  partial: boolean;
  /** Reads the failed reads again (all of them when none failed). */
  refetch: () => void;
};

const refetchAll = (queries: readonly UseQueryResult[]) => {
  const failed = queries.filter(({ isError }) => isError);

  (failed.length > 0 ? failed : queries).forEach((query) => {
    void query.refetch();
  });
};

/**
 * The user's loans, from every owner account (`useOwnerAccounts`):
 *
 * - each owner's loans with debt, one query each;
 * - the intermediary's loan in each of Borrow's markets, which the
 *   wallet-wide read leaves out once it is repaid (no debt, collateral
 *   left);
 * - the risk figures of each market a loan needs them from.
 *
 * Reads are merged by loan id. A failed read leaves the others' loans in
 * place (`partial`); missing risk figures stay `null`. Borrow manages a loan
 * only when it is in one of its markets and held by the intermediary.
 */
export const usePositions = (): Positions => {
  const reader = usePositionsReader();
  const owners = useOwnerAccounts();
  const repaidMarkets = reader.repaidMarkets();

  const ownerQueries = useQueries({
    queries: owners.owners.map((owner) => ({
      queryKey: ownerPositionsQueryKey(owner),
      queryFn: () => reader.readOwnerPositions(owner),
      ...POSITIONS_READ_OPTIONS,
    })),
  });

  // Only the intermediary's: it supplies collateral only for Borrow's loans,
  // so collateral there without debt is a repaid loan. A wallet's own
  // supply-only position is a deposit, not a loan.
  const { intermediary } = owners;
  const marketReads = intermediary
    ? repaidMarkets.map((market) => ({ owner: intermediary, market }))
    : [];

  const marketQueries = useQueries({
    queries: marketReads.map(({ owner, market }) => ({
      queryKey: marketPositionQueryKey(owner, market),
      queryFn: () => reader.readMarketPosition(owner, market),
      ...POSITIONS_READ_OPTIONS,
    })),
  });

  const byId = new Map<string, LoanPosition>();

  ownerQueries.forEach(({ data }) =>
    data?.forEach((loan) => byId.set(loan.id, loan)),
  );
  marketQueries.forEach(({ data }) => {
    if (data && !byId.has(data.id)) {
      byId.set(data.id, data);
    }
  });

  const read = [...byId.values()];

  const riskMarkets = [
    ...new Map(
      read
        .filter(needsMarketRisk)
        .map(({ network, marketId }) => [
          marketKey({ network, marketId }),
          { network, marketId },
        ]),
    ).values(),
  ];

  const riskQueries = useQueries({
    queries: riskMarkets.map((market) => ({
      queryKey: marketRiskQueryKey(market),
      queryFn: () => reader.readMarketRisk(market),
      retry: retryRead,
      staleTime: MARKET_RISK_STALE_TIME_MS,
    })),
  });

  const risks = new Map<string, PositionMarketRisk>();

  riskMarkets.forEach((market, index) => {
    const data = riskQueries[index]?.data;

    if (data) {
      risks.set(marketKey(market), data);
    }
  });

  const positions = read.map((loan) => {
    const risk = risks.get(marketKey(loan));
    const owned = {
      ...loan,
      manageable: loan.manageable && loan.owner === intermediary,
    };

    return risk ? withMarketRisk(owned, risk) : owned;
  });

  const reads: UseQueryResult[] = [...ownerQueries, ...marketQueries];
  const refetch = () => {
    if (owners.status === 'error') {
      owners.refetch();
    }

    refetchAll(reads);
  };

  const base = { positions, refetch };

  if (owners.status === 'idle') {
    return { ...base, status: 'idle', partial: false };
  }

  if (owners.status === 'error') {
    return { ...base, status: 'error', partial: false };
  }

  const anyFailed = reads.some(({ isError }) => isError);
  const allFailed = reads.length > 0 && reads.every(({ isError }) => isError);

  if (owners.status === 'pending' || reads.some(({ isPending }) => isPending)) {
    return { ...base, status: 'pending', partial: false };
  }

  if (allFailed && positions.length === 0) {
    return { ...base, status: 'error', partial: false };
  }

  return { ...base, status: 'success', partial: anyFailed };
};
