import { Card } from '@aurora-is-near/ui-kit';
import { useState } from 'react';

import { assertNever } from '@/utils/assertNever';
import { useMarketSnapshots } from '@/domains/markets/hooks/useMarketSnapshots';
import type {
  MarketListError,
  MarketSnapshotResult,
} from '@/domains/markets/hooks/useMarketSnapshots';

import {
  bestOf,
  groupByProvider,
  pairRow,
  providerRows,
} from '../../model/marketRows';
import {
  MarketCard,
  MarketCards,
  MarketCardSkeleton,
  StaticMarketCard,
} from './MarketCard';
import { MarketError } from './MarketError';
import type { MarketPair, ProviderRow } from '../../model/marketRows';

/**
 * Borrow's launch providers, Aave alone: the number of skeletons shown
 * while the market list itself is still loading.
 */
const LAUNCH_PROVIDER_COUNT = 1;

/**
 * Morpho and Spark as drawn beside Aave (Web-Borrow-NotConnected.dc.html
 * lines 1127–1129), sample figures only: Borrow does not lend on them yet.
 * The APR is the artboard's rate for the borrowed asset, USDC's otherwise.
 */
const STATIC_MARKETS = {
  morpho: {
    name: 'Morpho',
    maxLtv: '84%',
    liqLtv: '86%',
    liquidity: '$412M',
    rates: { USDC: 3.92, USDS: 4.05, DAI: 4.01, USDT: 4.28, GHO: 4.7 },
  },
  spark: {
    name: 'Spark',
    maxLtv: '80%',
    liqLtv: '82.5%',
    liquidity: '$356M',
    rates: { USDC: 4.41, USDS: 3.85, DAI: 4.25, USDT: 4.9, GHO: 5.3 },
  },
} as const;

function StaticMarket({
  market: { rates, ...figures },
  borrow,
}: {
  market: (typeof STATIC_MARKETS)[keyof typeof STATIC_MARKETS];
  borrow: string;
}) {
  const rate =
    (rates as Record<string, number>)[borrow.toUpperCase()] ?? rates.USDC;

  return <StaticMarketCard apr={`${rate.toFixed(2)}%`} {...figures} />;
}

type Item =
  /** `name`: the provider's, once its markets are listed. */
  | { kind: 'loading'; key: string; name?: string }
  | { kind: 'error'; key: string; name: string; retry: () => void }
  | { kind: 'listError'; key: string; retry: () => void }
  | { kind: 'provider'; key: string; row: ProviderRow };

/**
 * One item per provider, from the reads of its chains (`results`, never
 * empty). A skeleton while any chain is pending, so the chosen chain does
 * not jump as the others load. Then the chains that loaded with the pair,
 * a failed read counting as none whatever data an earlier read left, so
 * no number is shown for it. With none, a Banner when a chain failed (it
 * may have had the pair), its retry reading each failed chain again;
 * nothing when every chain lacks the pair.
 */
const providerItem = (
  results: readonly MarketSnapshotResult[],
  pair: MarketPair,
  loanUsd: number | undefined,
): Item | undefined => {
  const [first] = results;

  if (!first) {
    return undefined;
  }

  const key = `provider-${first.market.provider}`;
  const { name } = first.market;

  if (results.some(({ status }) => status === 'pending')) {
    return { kind: 'loading', key, name };
  }

  const rows = results.flatMap((result) =>
    result.status === 'success' ? (pairRow(result.data, pair) ?? []) : [],
  );

  const [row] = providerRows(rows, loanUsd);

  if (row) {
    return { kind: 'provider', key, row };
  }

  const failed = results.filter(({ status }) => status === 'error');

  return failed.length > 0
    ? {
        kind: 'error',
        key,
        name,
        retry: () => {
          failed.forEach(({ refetch }) => refetch());
        },
      }
    : undefined;
};

const listItems = (
  snapshots: MarketSnapshotResult[],
  listing: boolean,
  listErrors: MarketListError[],
  pair: MarketPair,
  loanUsd: number | undefined,
): Item[] => {
  const items = groupByProvider(snapshots).flatMap(
    (results) => providerItem(results, pair, loanUsd) ?? [],
  );

  const placeholders: Item[] =
    listing && snapshots.length === 0
      ? Array.from({ length: LAUNCH_PROVIDER_COUNT }, (_, index) => ({
          kind: 'loading',
          key: `listing-${index}`,
        }))
      : [];

  const errors: Item[] = listErrors.map(({ adapterId, refetch }) => ({
    kind: 'listError',
    key: `list-error-${adapterId}`,
    retry: refetch,
  }));

  return [...items, ...placeholders, ...errors];
};

export type MarketListProps = {
  /** The collateral and borrow symbols every row is read for. */
  pair: MarketPair;
  /**
   * The loan's size in dollars, which each provider's chain must have the
   * liquidity for; `undefined` while it is not known (every chain counts).
   */
  loanUsd?: number;
  /** The picked provider (`LendingMarket.provider`), when the caller owns the selection. */
  selectedId?: string;
  /** Called with the provider (`LendingMarket.provider`) the user picks. */
  onSelect?: (provider: string) => void;
  /** Providers the loan's LTV is too high for: shown off and not pickable. */
  disabledIds?: readonly string[];
};

const NO_IDS: readonly string[] = [];

/**
 * Every provider's figures for `pair`, one card per provider
 * (Aave, not Aave on each chain), with the figures of the chain it lends
 * on: the lowest APR among its chains with the liquidity for `loanUsd`
 * (`chooseChain`). The chain itself is not shown. With two or more providers, BEST marks the
 * lowest APR among those that can be picked; with one it means nothing and
 * is not shown. The selection defaults to the lowest APR either way.
 *
 * Each chain loads and fails on its own: a provider shows a skeleton while
 * any of its chains loads, then the chains that loaded; a Banner with "Try
 * again" only when none did and a read failed. A provider without the pair
 * is left out.
 */
export function MarketList({
  pair,
  loanUsd,
  selectedId,
  onSelect,
  disabledIds = NO_IDS,
}: MarketListProps) {
  const { snapshots, listing, listErrors } = useMarketSnapshots();
  const [picked, setPicked] = useState<string>();

  const items = listItems(snapshots, listing, listErrors, pair, loanUsd);
  const rows = items.flatMap((item) =>
    item.kind === 'provider' ? [item.row] : [],
  );

  const pickable = rows.filter(
    ({ provider }) => !disabledIds.includes(provider),
  );

  const loading = items.some(({ kind }) => kind === 'loading');
  // Compared only once every market has settled, so no card is tagged BEST
  // (or selected by default) before the markets still loading are known.
  const lowest = loading
    ? undefined
    : bestOf(pickable.map(({ chosen }) => chosen))?.market.provider;

  const best = rows.length > 1 ? lowest : undefined;
  const selected =
    selectedId ??
    (pickable.some(({ provider }) => provider === picked)
      ? picked
      : undefined) ??
    lowest;

  const pick = (provider: string) => {
    setPicked(provider);
    onSelect?.(provider);
  };

  if (items.length === 0) {
    return (
      <Card className="rounded-18 p-4 text-14 leading-1.45 text-mut">
        No market offers {pair.collateral} / {pair.borrow} right now.
      </Card>
    );
  }

  const content = items.map((item) => {
    switch (item.kind) {
      case 'loading':
        return <MarketCardSkeleton key={item.key} name={item.name} />;
      case 'error':
        return (
          <MarketError
            key={item.key}
            retry={item.retry}
            title={`${item.name} did not load`}
          />
        );
      case 'listError':
        return (
          <MarketError
            key={item.key}
            retry={item.retry}
            title="The markets did not load"
          />
        );

      case 'provider': {
        const { provider } = item.row;

        return (
          <MarketCard
            key={item.key}
            best={best === provider}
            off={disabledIds.includes(provider)}
            row={item.row}
            selected={selected === provider}
            onPick={() => pick(provider)}
          />
        );
      }
      default:
        return assertNever(item, 'market list item');
    }
  });

  // The artboard's order: Morpho, Aave, Spark.
  return (
    <MarketCards loading={loading}>
      <StaticMarket borrow={pair.borrow} market={STATIC_MARKETS.morpho} />
      {content}
      <StaticMarket borrow={pair.borrow} market={STATIC_MARKETS.spark} />
    </MarketCards>
  );
}
