import {
  Banner,
  Button,
  Card,
  ChainMark,
  cn,
  Skeleton,
} from '@aurora-is-near/ui-kit';
import { useState } from 'react';

import {
  formatApr,
  formatBps,
  formatCompactUsd,
  tokenAmountToUsd,
} from '../markets/format';
import type { LendingMarket, MarketSnapshot } from '../markets/types';
import {
  type MarketListError,
  type MarketSnapshotResult,
  useMarketSnapshots,
} from '../markets/useMarketSnapshots';

/**
 * The pair every row is read for until the New loan form drives it: WETH
 * collateral and USDC borrow. The artboard's default is wstETH (line 1052),
 * but 1Click does not deliver wstETH on Base or Arbitrum, so no market had
 * the pair; WETH is delivered on both and is Aave collateral on both (decided
 * in the feature review). Matched against the reserve's symbol, in any case,
 * so Arbitrum's bridged `USDC.e` is not taken for USDC.
 */
export const DEFAULT_PAIR = { collateral: 'WETH', borrow: 'USDC' } as const;

/**
 * Borrow's launch chains, Base and Arbitrum: the number of card skeletons
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

type MarketRow = {
  market: LendingMarket;
  apr: number;
  maxLtvBps: number;
  liquidationLtvBps: number;
  liquidityUsd: number;
};

type Item =
  | { kind: 'loading'; key: string; market?: LendingMarket }
  | { kind: 'error'; key: string; market: LendingMarket; retry: () => void }
  | { kind: 'listError'; key: string; retry: () => void }
  | { kind: 'market'; key: string; row: MarketRow };

const sameSymbol = (a: string, b: string) =>
  a.toLowerCase() === b.toLowerCase();

/**
 * The pair's figures in one snapshot: APR and liquidity from the borrow
 * reserve, the LTVs from the collateral reserve. `undefined` when the market
 * lacks either reserve, or either cannot take a new loan now.
 */
const pairRow = (snapshot: MarketSnapshot): MarketRow | undefined => {
  const collateral = snapshot.collateral.find(({ symbol }) =>
    sameSymbol(symbol, DEFAULT_PAIR.collateral),
  );

  const borrow = snapshot.borrowable.find(({ symbol }) =>
    sameSymbol(symbol, DEFAULT_PAIR.borrow),
  );

  if (
    !collateral ||
    !borrow ||
    collateral.unavailable === true ||
    borrow.unavailable === true
  ) {
    return undefined;
  }

  return {
    market: snapshot.market,
    apr: borrow.variableBorrowApr,
    maxLtvBps: collateral.maxLtvBps,
    liquidationLtvBps: collateral.liquidationLtvBps,
    liquidityUsd: tokenAmountToUsd({
      amount: borrow.availableLiquidity,
      decimals: borrow.decimals,
      priceBase: borrow.priceBase,
      baseCurrencyUnit: snapshot.baseCurrencyUnit,
    }),
  };
};

/**
 * One item per market, in order. A failed read is an error whatever data
 * an earlier read left, so no number is shown for it.
 */
const snapshotItem = (result: MarketSnapshotResult): Item | undefined => {
  const key = `${result.adapterId}:${result.market.id}`;

  if (result.status === 'error') {
    return { kind: 'error', key, market: result.market, retry: result.refetch };
  }

  if (result.status === 'pending' || !result.data) {
    return { kind: 'loading', key, market: result.market };
  }

  const row = pairRow(result.data);

  return row ? { kind: 'market', key, row } : undefined;
};

const listItems = (
  snapshots: MarketSnapshotResult[],
  listing: boolean,
  listErrors: MarketListError[],
): Item[] => {
  const items = snapshots.flatMap((result) => snapshotItem(result) ?? []);

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

/** The lowest APR among the markets that can be picked; the first on a tie. */
const bestOf = (rows: MarketRow[]): MarketRow | undefined =>
  rows.reduce<MarketRow | undefined>(
    (best, row) => (!best || row.apr < best.apr ? row : best),
    undefined,
  );

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
};

/** A failed read in the card's place: a kit `Banner` with a retry. */
function MarketError({ title, retry }: MarketErrorProps) {
  return (
    <Banner
      className="min-w-0 flex-[1_1_170px] mobile:flex-[1_1_0]"
      title={title}
      tone="danger">
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

export type MarketListLayout = 'cards' | 'table';

export type MarketListProps = {
  /** `cards` (the artboard's default); `table` is drawn as cards for now. */
  layout: MarketListLayout;
  /** The picked market, when the caller owns the selection. */
  selectedId?: string;
  /** Called with the market id the user picks. */
  onSelect?: (marketId: string) => void;
  /** Markets the loan's LTV is too high for: shown off and not pickable. */
  disabledIds?: readonly string[];
};

const NO_IDS: readonly string[] = [];

/**
 * Every market's figures for the default pair (WETH / USDC), one card per
 * market. BEST marks the lowest borrow APR among the markets that can be
 * picked, and the selection defaults to it. Each market loads and fails on
 * its own: a skeleton while it loads, a Banner with "Try again" when its read
 * fails. A market without the pair is left out.
 */
export function MarketList({
  layout,
  selectedId,
  onSelect,
  disabledIds = NO_IDS,
}: MarketListProps) {
  const { snapshots, listing, listErrors } = useMarketSnapshots();
  const [picked, setPicked] = useState<string>();

  const items = listItems(snapshots, listing, listErrors);
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
        No market offers {DEFAULT_PAIR.collateral} / {DEFAULT_PAIR.borrow} right
        now.
      </Card>
    );
  }

  return (
    // Gap 10, wrapping (line 345). The table layout (`.mgrid`, lines 323–343)
    // comes later; until then it shows the cards.
    <div
      aria-busy={loading || undefined}
      className="flex flex-wrap gap-[10px]"
      data-layout={layout}>
      {items.map((item) => {
        switch (item.kind) {
          case 'loading':
            return <MarketCardSkeleton key={item.key} market={item.market} />;
          case 'error':
            return (
              <MarketError
                key={item.key}
                retry={item.retry}
                title={`${marketTitle(item.market)} did not load`}
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

          case 'market': {
            const { id } = item.row.market;

            return (
              <MarketCard
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
      })}
    </div>
  );
}
