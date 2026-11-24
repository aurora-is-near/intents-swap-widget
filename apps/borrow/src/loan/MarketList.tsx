import {
  Banner,
  Button,
  Card,
  ChainMark,
  cn,
  Skeleton,
} from '@aurora-is-near/ui-kit';
import { useState } from 'react';

import { formatApr, formatBps, formatCompactUsd } from '../markets/format';
import type { LendingMarket } from '../markets/types';
import {
  type MarketListError,
  type MarketSnapshotResult,
  useMarketSnapshots,
} from '../markets/useMarketSnapshots';
import {
  bestOf,
  type MarketPair,
  pairRow,
  type ProviderRow,
  providerRows,
} from './marketRows';

/**
 * Borrow's launch providers, Aave alone: the number of skeletons shown
 * while the market list itself is still loading.
 */
const LAUNCH_PROVIDER_COUNT = 1;

/**
 * Chain marks by SDK slug. The colours are the artboard's chain dots
 * (`CH`, line 1099); the letters follow the kit's two-letter marks. White on
 * Base's blue, ink on Arbitrum's lighter blue, for contrast.
 */
const CHAIN_MARKS: Record<string, { label: string; bg: string; fg: string }> = {
  base: { label: 'BA', bg: '#2E6BFF', fg: '#FFFFFF' },
  arb: { label: 'AR', bg: '#1F8FD6', fg: '#111613' },
};

/**
 * `.mkc` (Web-Borrow-NotConnected.dc.html lines 72–77): flex 1 1 170px,
 * padding 16, radius 18, 1.5px `bd`, `sf`, a column with gap 12; at ≤640px
 * one row of equal cards, padding 12, gap 8 (lines 122–123). The browser's
 * own button line-height, as the artboard has.
 */
const CARD =
  'box-border flex min-w-0 flex-[1_1_170px] flex-col gap-[12px] rounded-[18px] border-[1.5px] border-solid border-bd bg-sf p-[16px] text-left font-sans leading-[normal] text-ink mobile:flex-[1_1_0] mobile:gap-[8px] mobile:p-[12px]';

/**
 * The card as a button: hover `mid`, focus ring (lines 73, 77), `.best` tint
 * (line 74), `.sel` 3px ink border with the padding taken in to keep the box
 * (line 75, mobile line 124), `.off` at .55 opacity (line 76).
 */
const CARD_BUTTON = `${CARD} cursor-pointer enabled:hover:border-mid focus-visible:outline-[3px] focus-visible:outline-offset-2 focus-visible:outline-ink focus-visible:outline-solid disabled:cursor-not-allowed`;
/** `.best` comes after `:hover` (lines 73–74), so it keeps `limebd` on hover. */
const CARD_BEST = 'border-limebd bg-tint enabled:hover:border-limebd';
const CARD_SELECTED =
  'border-[3px] border-ink p-[14.5px] enabled:hover:border-ink mobile:p-[10.5px]';

const CARD_OFF = 'opacity-55';

/** `.mkn` (line 352): 26px / 800 / -0.03em / 1.1; 19px at ≤640px (line 124). */
const NAME =
  'text-[26px] font-extrabold leading-[1.1] tracking-[-0.03em] mobile:text-[19px]';

/** `.mka` (line 357): 34px / 800 / -0.03em / 1; 24px at ≤640px (line 125). */
const APR =
  'text-[34px] font-extrabold leading-none tracking-[-0.03em] mobile:text-[24px]';

/** The two 13px `mut2` lines (lines 358–360). */
const META = 'text-[13px] text-mut2';

/** The first line (line 347): min-height 18, the BEST or "MAX" tag. */
const TAG_ROW = 'flex min-h-[18px] items-center';

/** Line 349: 11px, 0.1em, a 7px `#5E9E12` dot (no token on the artboard). */
const BEST_TAG =
  'inline-flex items-center gap-[6px] text-[11px] tracking-[0.1em]';

type Item =
  /** `name`: the provider's, once its markets are listed. */
  | { kind: 'loading'; key: string; name?: string }
  | { kind: 'error'; key: string; name: string; retry: () => void }
  | { kind: 'listError'; key: string; retry: () => void }
  | { kind: 'provider'; key: string; row: ProviderRow };

/**
 * The snapshot reads by provider (`LendingMarket.provider`, the key
 * `providerRows` and `marketFit` use), in the order each provider first
 * comes, whichever adapter listed them.
 */
const byProvider = (
  snapshots: readonly MarketSnapshotResult[],
): MarketSnapshotResult[][] => {
  const groups = new Map<string, MarketSnapshotResult[]>();

  snapshots.forEach((result) => {
    const { provider } = result.market;
    const group = groups.get(provider);

    if (group) {
      group.push(result);
    } else {
      groups.set(provider, [result]);
    }
  });

  return [...groups.values()];
};

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
  const items = byProvider(snapshots).flatMap(
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

/** The chain a provider lends on: its mark, then "on Arbitrum". */
function ChainLabel({ market }: { market: LendingMarket }) {
  const mark = CHAIN_MARKS[market.chain] ?? {
    label: market.chainLabel.slice(0, 2).toUpperCase(),
    bg: 'var(--mid2)',
    fg: 'var(--ink)',
  };

  return (
    <span className="inline-flex items-center gap-[6px] text-[13px] font-semibold tracking-normal text-mut">
      {/* No ring: the mark stands alone, on `sf` or the BEST tint. */}
      <ChainMark aria-hidden="true" ringColor="transparent" {...mark} />
      on {market.chainLabel}
    </span>
  );
}

type MarketCardProps = {
  row: ProviderRow;
  best: boolean;
  selected: boolean;
  off: boolean;
  onPick: () => void;
};

/**
 * One provider as an `.mkc` card (lines 346–361), with its chosen chain's
 * figures.
 */
function MarketCard({ row, best, selected, off, onPick }: MarketCardProps) {
  const { chosen } = row;
  const maxLtv = formatBps(chosen.maxLtvBps);

  return (
    <button
      aria-pressed={selected}
      className={cn(
        CARD_BUTTON,
        best && CARD_BEST,
        selected && CARD_SELECTED,
        off && CARD_OFF,
      )}
      disabled={off}
      type="button"
      onClick={onPick}>
      <div className={TAG_ROW}>
        {best ? (
          <span className={BEST_TAG}>
            <span
              aria-hidden="true"
              className="inline-block h-[7px] w-[7px] rounded-full bg-[#5E9E12]"
            />
            BEST
          </span>
        ) : null}
        {off ? (
          // Line 350: the market's own limit, in `neg`.
          <span className="text-[11px] text-neg">
            <span className="sr-only">LTV too high, </span>MAX {maxLtv}
          </span>
        ) : null}
      </div>
      {/* The chain beside the name (decided), wrapping under it when the
          card is narrow. */}
      <div
        className={cn(
          NAME,
          'flex flex-wrap items-center gap-x-[8px] gap-y-[4px]',
        )}>
        {best ? (
          // Line 353: the accent highlight on the BEST market's name.
          <span className="inline-block rounded-[8px] bg-accent px-[8px] text-onlime">
            {row.name}
          </span>
        ) : (
          <span>{row.name}</span>
        )}
        <ChainLabel market={chosen.market} />
      </div>
      <div>
        <div className={APR}>{formatApr(chosen.apr)}</div>
        <div className={cn(META, 'mt-[4px]')}>APR · max LTV {maxLtv}</div>
      </div>
      <div className={cn(META, 'border-t border-solid border-bd pt-[10px]')}>
        Liq. {formatBps(chosen.liquidationLtvBps)} ·{' '}
        {formatCompactUsd(chosen.liquidityUsd)}
      </div>
    </button>
  );
}

/** A skeleton's screen-reader label: the provider once it is listed. */
const loadingLabel = (name: string | undefined) =>
  name ? `Loading ${name}` : 'Loading markets';

/**
 * A card-shaped placeholder: the same box and lines as a card, each line a
 * kit `Skeleton` sized in `em` so it follows the mobile type sizes.
 */
function MarketCardSkeleton({ name }: { name?: string }) {
  return (
    <div className={CARD}>
      <span className="sr-only">{loadingLabel(name)}</span>
      <div className={TAG_ROW}>
        <Skeleton height={11} width={44} />
      </div>
      <div className={NAME}>
        <Skeleton height="1.1em" width="3.4em" />
      </div>
      <div>
        <div className={APR}>
          <Skeleton height="1em" width="3.2em" />
        </div>
        <div className={cn(META, 'mt-[4px]')}>
          <Skeleton height="1.2em" width="80%" />
        </div>
      </div>
      <div className={cn(META, 'border-t border-solid border-bd pt-[10px]')}>
        <Skeleton height="1.2em" width="60%" />
      </div>
    </div>
  );
}

type MarketErrorProps = {
  title: string;
  retry: () => void;
  className?: string;
};

/** A failed read in the card's or row's place: a kit `Banner` with a retry. */
function MarketError({
  title,
  retry,
  className = 'min-w-0 flex-[1_1_170px] mobile:flex-[1_1_0]',
}: MarketErrorProps) {
  return (
    <Banner className={className} title={title} tone="danger">
      <p className="m-0">The market data could not be read.</p>
      <Button
        className="mt-[10px] px-[14px] py-[6px] text-[14px]"
        variant="secondary"
        onClick={retry}>
        Try again
      </Button>
    </Banner>
  );
}

/**
 * `.mgrid` (line 78): five columns, gap 8, centred. `.mrow` (lines 79–84):
 * full width, padding 0 20px, min-height 78, radius 18, 1.5px `bd`, `sf`;
 * hover `mid`, `.best` tint, `.sel` 3px ink border with padding 18.5, `.off`
 * at .55. The mobile artboard sets no override for either.
 */
const GRID =
  'grid grid-cols-[minmax(150px,1.5fr)_minmax(84px,1fr)_64px_88px_84px] items-center gap-x-[8px]';

const ROW = `${GRID} box-border min-h-[78px] w-full min-w-0 rounded-[18px] border-[1.5px] border-solid border-bd bg-sf px-[20px] py-0 text-left font-sans leading-[normal] text-ink`;
const ROW_BUTTON = `${ROW} cursor-pointer enabled:hover:border-mid focus-visible:outline-[3px] focus-visible:outline-offset-2 focus-visible:outline-ink focus-visible:outline-solid disabled:cursor-not-allowed`;
const ROW_SELECTED =
  'border-[3px] border-ink px-[18.5px] enabled:hover:border-ink';

/** The figures (lines 338–340): 18px / 700. */
const FIGURE = 'text-[18px] font-bold';

const COLUMNS = [
  'Market',
  'Borrow APR',
  'Max LTV',
  'Liquidation',
  'Liquidity',
] as const;

/**
 * One provider as an `.mrow` (lines 328–341), with its chosen chain's
 * figures.
 */
function MarketTableRow({ row, best, selected, off, onPick }: MarketCardProps) {
  const { chosen } = row;

  return (
    <button
      aria-pressed={selected}
      className={cn(
        ROW_BUTTON,
        best && CARD_BEST,
        selected && ROW_SELECTED,
        off && CARD_OFF,
      )}
      disabled={off}
      type="button"
      onClick={onPick}>
      {/* The artboard's cell (name, then the tag, one nowrap line) with the
          chain label under it, so the line fits the 150px column minimum. */}
      <span className="flex min-w-0 flex-col items-start gap-[4px]">
        <span className="flex items-center gap-[10px] whitespace-nowrap">
          <span
            className={cn(
              'text-[24px] font-extrabold leading-[1.25] tracking-[-0.03em]',
              best && 'rounded-[8px] bg-accent px-[8px] text-onlime',
            )}>
            {row.name}
          </span>
          {best ? (
            <span className={BEST_TAG}>
              <span
                aria-hidden="true"
                className="inline-block h-[7px] w-[7px] rounded-full bg-[#5E9E12]"
              />
              BEST
            </span>
          ) : null}
          {off ? (
            <span className="text-[11px] tracking-[0.06em] text-neg">
              LTV TOO HIGH
            </span>
          ) : null}
        </span>
        <ChainLabel market={chosen.market} />
      </span>
      <span className="text-[24px] font-extrabold tracking-[-0.03em]">
        <span className="sr-only">Borrow APR </span>
        {formatApr(chosen.apr)}
      </span>
      <span className={FIGURE}>
        <span className="sr-only">Max LTV </span>
        {formatBps(chosen.maxLtvBps)}
      </span>
      <span className={FIGURE}>
        <span className="sr-only">Liquidation </span>
        {formatBps(chosen.liquidationLtvBps)}
      </span>
      <span className={FIGURE}>
        <span className="sr-only">Liquidity </span>
        {formatCompactUsd(chosen.liquidityUsd)}
      </span>
    </button>
  );
}

/** A row-shaped placeholder: the same grid and height, a `Skeleton` per cell. */
function MarketRowSkeleton({ name }: { name?: string }) {
  return (
    <div className={ROW} data-testid="market-row-skeleton">
      <span className="sr-only">{loadingLabel(name)}</span>
      <Skeleton height={28} width="60%" />
      <Skeleton height={28} width="70%" />
      <Skeleton height={20} width="80%" />
      <Skeleton height={20} width="80%" />
      <Skeleton height={20} width="80%" />
    </div>
  );
}

export type MarketListLayout = 'cards' | 'table';

export type MarketListProps = {
  /** `cards` (the artboard's default); `table` is the `.mgrid` rows. */
  layout: MarketListLayout;
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
 * Every provider's figures for `pair`, one card or table row per provider
 * (Aave, not Aave on each chain), on the chain it lends on: the lowest APR
 * among its chains with the liquidity for `loanUsd` (`chooseChain`), shown
 * by the chain's mark and name. With two or more providers, BEST marks the
 * lowest APR among those that can be picked; with one it means nothing and
 * is not shown. The selection defaults to the lowest APR either way.
 *
 * Each chain loads and fails on its own: a provider shows a skeleton while
 * any of its chains loads, then the chains that loaded; a Banner with "Try
 * again" only when none did and a read failed. A provider without the pair
 * is left out.
 */
export function MarketList({
  layout,
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
      <Card className="rounded-[18px] p-[16px] text-[14px] leading-[1.45] text-mut">
        No market offers {pair.collateral} / {pair.borrow} right now.
      </Card>
    );
  }

  const table = layout === 'table';

  const content = items.map((item) => {
    switch (item.kind) {
      case 'loading':
        return table ? (
          <MarketRowSkeleton key={item.key} name={item.name} />
        ) : (
          <MarketCardSkeleton key={item.key} name={item.name} />
        );
      case 'error':
        return (
          <MarketError
            key={item.key}
            className={table ? 'min-w-0' : undefined}
            retry={item.retry}
            title={`${item.name} did not load`}
          />
        );
      case 'listError':
        return (
          <MarketError
            key={item.key}
            className={table ? 'min-w-0' : undefined}
            retry={item.retry}
            title="The markets did not load"
          />
        );

      case 'provider': {
        const { provider } = item.row;
        const Row = table ? MarketTableRow : MarketCard;

        return (
          <Row
            key={item.key}
            best={best === provider}
            off={disabledIds.includes(provider)}
            row={item.row}
            selected={selected === provider}
            onPick={() => pick(provider)}
          />
        );
      }
      default: {
        const unknown: never = item;

        return unknown;
      }
    }
  });

  if (table) {
    return (
      <div aria-busy={loading || undefined} data-layout={layout}>
        {/* Line 325: padding 0 20px 8px, 12px `mut2`. */}
        <div
          aria-hidden="true"
          className={cn(GRID, 'px-[20px] pb-[8px] text-[12px] text-mut2')}>
          {COLUMNS.map((name) => (
            <span key={name}>{name}</span>
          ))}
        </div>
        <div className="flex flex-col gap-[10px]">{content}</div>
      </div>
    );
  }

  return (
    // Gap 10, wrapping (line 345).
    <div
      aria-busy={loading || undefined}
      className="flex flex-wrap gap-[10px]"
      data-layout={layout}>
      {content}
    </div>
  );
}
