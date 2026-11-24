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
import { bestOf, type MarketPair, type MarketRow, pairRow } from './marketRows';

/**
 * Borrow's launch chains, Base and Arbitrum: the number of skeletons
 * shown while the market list itself is still loading.
 */
const LAUNCH_CHAIN_COUNT = 2;

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
  | { kind: 'loading'; key: string; market?: LendingMarket }
  | { kind: 'error'; key: string; market: LendingMarket; retry: () => void }
  | { kind: 'listError'; key: string; retry: () => void }
  | { kind: 'market'; key: string; row: MarketRow };

/**
 * One item per market, in order. A failed read is an error whatever data
 * an earlier read left, so no number is shown for it.
 */
const snapshotItem = (
  result: MarketSnapshotResult,
  pair: MarketPair,
): Item | undefined => {
  const key = `${result.adapterId}:${result.market.id}`;

  if (result.status === 'error') {
    return { kind: 'error', key, market: result.market, retry: result.refetch };
  }

  if (result.status === 'pending' || !result.data) {
    return { kind: 'loading', key, market: result.market };
  }

  const row = pairRow(result.data, pair);

  return row ? { kind: 'market', key, row } : undefined;
};

const listItems = (
  snapshots: MarketSnapshotResult[],
  listing: boolean,
  listErrors: MarketListError[],
  pair: MarketPair,
): Item[] => {
  const items = snapshots.flatMap((result) => snapshotItem(result, pair) ?? []);

  const placeholders: Item[] =
    listing && snapshots.length === 0
      ? Array.from({ length: LAUNCH_CHAIN_COUNT }, (_, index) => ({
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

const marketTitle = (market: LendingMarket) =>
  `${market.name} on ${market.chainLabel}`;

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
      {market.chainLabel}
    </span>
  );
}

type MarketCardProps = {
  row: MarketRow;
  best: boolean;
  selected: boolean;
  off: boolean;
  onPick: () => void;
};

/** One market as an `.mkc` card (lines 346–361). */
function MarketCard({ row, best, selected, off, onPick }: MarketCardProps) {
  const { market } = row;
  const maxLtv = formatBps(row.maxLtvBps);

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
            {market.name}
          </span>
        ) : (
          <span>{market.name}</span>
        )}
        <ChainLabel market={market} />
      </div>
      <div>
        <div className={APR}>{formatApr(row.apr)}</div>
        <div className={cn(META, 'mt-[4px]')}>APR · max LTV {maxLtv}</div>
      </div>
      <div className={cn(META, 'border-t border-solid border-bd pt-[10px]')}>
        Liq. {formatBps(row.liquidationLtvBps)} ·{' '}
        {formatCompactUsd(row.liquidityUsd)}
      </div>
    </button>
  );
}

/**
 * A card-shaped placeholder: the same box and lines as a card, each line a
 * kit `Skeleton` sized in `em` so it follows the mobile type sizes.
 */
function MarketCardSkeleton({ market }: { market?: LendingMarket }) {
  return (
    <div className={CARD}>
      <span className="sr-only">
        {market ? `Loading ${marketTitle(market)}` : 'Loading markets'}
      </span>
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

/** One market as an `.mrow` (lines 328–341). */
function MarketTableRow({ row, best, selected, off, onPick }: MarketCardProps) {
  const { market } = row;

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
            {market.name}
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
        <ChainLabel market={market} />
      </span>
      <span className="text-[24px] font-extrabold tracking-[-0.03em]">
        <span className="sr-only">Borrow APR </span>
        {formatApr(row.apr)}
      </span>
      <span className={FIGURE}>
        <span className="sr-only">Max LTV </span>
        {formatBps(row.maxLtvBps)}
      </span>
      <span className={FIGURE}>
        <span className="sr-only">Liquidation </span>
        {formatBps(row.liquidationLtvBps)}
      </span>
      <span className={FIGURE}>
        <span className="sr-only">Liquidity </span>
        {formatCompactUsd(row.liquidityUsd)}
      </span>
    </button>
  );
}

/** A row-shaped placeholder: the same grid and height, a `Skeleton` per cell. */
function MarketRowSkeleton({ market }: { market?: LendingMarket }) {
  return (
    <div className={ROW} data-testid="market-row-skeleton">
      <span className="sr-only">
        {market ? `Loading ${marketTitle(market)}` : 'Loading markets'}
      </span>
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
  /** The picked market, when the caller owns the selection. */
  selectedId?: string;
  /** Called with the market id the user picks. */
  onSelect?: (marketId: string) => void;
  /** Markets the loan's LTV is too high for: shown off and not pickable. */
  disabledIds?: readonly string[];
};

const NO_IDS: readonly string[] = [];

/**
 * Every market's figures for `pair`, one card or table row per market. BEST marks the lowest borrow APR among the markets
 * that can be picked, and the selection defaults to it. Each market loads and fails on
 * its own: a skeleton while it loads, a Banner with "Try again" when its read
 * fails. A market without the pair is left out.
 */
export function MarketList({
  layout,
  pair,
  selectedId,
  onSelect,
  disabledIds = NO_IDS,
}: MarketListProps) {
  const { snapshots, listing, listErrors } = useMarketSnapshots();
  const [picked, setPicked] = useState<string>();

  const items = listItems(snapshots, listing, listErrors, pair);
  const rows = items.flatMap((item) =>
    item.kind === 'market' ? [item.row] : [],
  );

  const pickable = rows.filter(
    ({ market }) => !disabledIds.includes(market.id),
  );

  const loading = items.some(({ kind }) => kind === 'loading');
  // Compared only once every market has settled, so no card is tagged BEST
  // (or selected by default) before the markets still loading are known.
  const best = loading ? undefined : bestOf(pickable);
  const selected =
    selectedId ??
    (pickable.some(({ market }) => market.id === picked)
      ? picked
      : undefined) ??
    best?.market.id;

  const pick = (marketId: string) => {
    setPicked(marketId);
    onSelect?.(marketId);
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
          <MarketRowSkeleton key={item.key} market={item.market} />
        ) : (
          <MarketCardSkeleton key={item.key} market={item.market} />
        );
      case 'error':
        return (
          <MarketError
            key={item.key}
            className={table ? 'min-w-0' : undefined}
            retry={item.retry}
            title={`${marketTitle(item.market)} did not load`}
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

      case 'market': {
        const { id } = item.row.market;
        const Row = table ? MarketTableRow : MarketCard;

        return (
          <Row
            key={item.key}
            best={best?.market.id === id}
            off={disabledIds.includes(id)}
            row={item.row}
            selected={selected === id}
            onPick={() => pick(id)}
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
