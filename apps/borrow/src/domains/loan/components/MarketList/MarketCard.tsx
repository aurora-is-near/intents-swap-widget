import { cn, Skeleton } from '@aurora-is-near/ui-kit';
import type { ReactNode } from 'react';

import {
  formatApr,
  formatBps,
  formatCompactUsd,
} from '@/domains/markets/utils/format';

import type { ProviderRow } from '../../model/marketRows';

/**
 * `.mkc` (Web-Borrow-NotConnected.dc.html lines 72–77): flex 1 1 170px,
 * padding 16, radius 18, 1.5px `bd`, `sf`, a column with gap 12; at ≤640px
 * one row of equal cards, padding 12, gap 8 (lines 122–123). The browser's
 * own button line-height, as the artboard has.
 */
const CARD =
  'box-border flex min-w-0 flex-[1_1_170px] flex-col gap-3 rounded-18 border-1.5 border-solid border-bd bg-sf p-4 text-left font-sans leading-font text-ink mobile:flex-[1_1_0] mobile:gap-2 mobile:p-3';

/** `.mkn` (line 352): 26px / 800 / -0.03em / 1.1; 19px at ≤640px (line 124). */
const NAME =
  'text-26 font-extrabold leading-1.1 tracking-figure mobile:text-19';

/** `.mka` (line 357): 34px / 800 / -0.03em / 1; 24px at ≤640px (line 125). */
const APR =
  'text-34 font-extrabold leading-none tracking-figure mobile:text-24';

/** The two 13px `mut2` lines (lines 358–360). */
const META = 'text-13 text-mut2';

/** The first line (line 347): min-height 18, the BEST or "MAX" tag. */
const TAG_ROW = 'flex min-h-4.5 items-center';

type MarketFiguresProps = {
  name: ReactNode;
  apr: string;
  maxLtv: string;
  liqLtv: string;
  liquidity: string;
};

/** A card's name, APR and the two `mut2` lines (lines 352–360). */
function MarketFigures({
  name,
  apr,
  maxLtv,
  liqLtv,
  liquidity,
}: MarketFiguresProps) {
  return (
    <>
      <div className={NAME}>{name}</div>
      <div>
        <div className={APR}>{apr}</div>
        <div className={cn(META, 'mt-1')}>APR · max LTV {maxLtv}</div>
      </div>
      <div className={cn(META, 'border-t border-solid border-bd pt-2.5')}>
        Liq. {liqLtv} · {liquidity}
      </div>
    </>
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
export function MarketCard({
  row,
  best,
  selected,
  off,
  onPick,
}: MarketCardProps) {
  const { chosen } = row;
  const maxLtv = formatBps(chosen.maxLtvBps);

  return (
    <button
      aria-pressed={selected}
      className={cn(
        CARD,
        // The card as a button: hover `mid`, focus ring (lines 73, 77).
        'cursor-pointer enabled:hover:border-mid focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-ink focus-visible:outline-solid disabled:cursor-not-allowed',
        // `.best` tint (line 74); it comes after `:hover` (lines 73–74), so
        // it keeps `limebd` on hover.
        best && 'border-limebd bg-tint enabled:hover:border-limebd',
        // `.sel` 3px ink border with the padding taken in to keep the box
        // (line 75, mobile line 124).
        selected &&
          'border-3 border-ink p-[14.5px] enabled:hover:border-ink mobile:p-[10.5px]',
        // `.off` at .55 opacity (line 76).
        off && 'opacity-55',
      )}
      disabled={off}
      type="button"
      onClick={onPick}>
      <div className={TAG_ROW}>
        {best ? (
          // Line 349: 11px, 0.1em, a 7px `#5E9E12` dot (no token on the
          // artboard).
          <span className="inline-flex items-center gap-1.5 text-11 tracking-widest">
            <span
              aria-hidden="true"
              className="inline-block h-1.75 w-1.75 rounded-full bg-live"
            />
            BEST
          </span>
        ) : null}
        {off ? (
          // Line 350: the market's own limit, in `neg`.
          <span className="text-11 text-neg">
            <span className="sr-only">LTV too high, </span>MAX {maxLtv}
          </span>
        ) : null}
      </div>
      {/* No chain label: the tile is the provider, whichever chain it
          lends on. */}
      <MarketFigures
        apr={formatApr(chosen.apr)}
        liqLtv={formatBps(chosen.liquidationLtvBps)}
        liquidity={formatCompactUsd(chosen.liquidityUsd)}
        maxLtv={maxLtv}
        name={
          best ? (
            // Line 353: the accent highlight on the BEST market's name.
            <span className="inline-block rounded-8 bg-accent px-2 text-onlime">
              {row.name}
            </span>
          ) : (
            row.name
          )
        }
      />
    </button>
  );
}

/**
 * A provider Borrow does not lend on yet, with the artboard's sample
 * figures (lines 1127–1129): the card's look, but not a button, so it can
 * be neither picked nor focused, and it never counts for BEST.
 */
export function StaticMarketCard(props: MarketFiguresProps & { name: string }) {
  return (
    // A labelled group, not a button: its figures read as one card.
    <div aria-label={props.name} className={CARD} role="group">
      <div className={TAG_ROW} />
      <MarketFigures {...props} />
    </div>
  );
}

/** A skeleton's screen-reader label: the provider once it is listed. */
const loadingLabel = (name: string | undefined) =>
  name ? `Loading ${name}` : 'Loading markets';

/**
 * A card-shaped placeholder: the same box and lines as a card, each line a
 * kit `Skeleton` sized in `em` so it follows the mobile type sizes.
 */
export function MarketCardSkeleton({ name }: { name?: string }) {
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
        <div className={cn(META, 'mt-1')}>
          <Skeleton height="1.2em" width="80%" />
        </div>
      </div>
      <div className={cn(META, 'border-t border-solid border-bd pt-2.5')}>
        <Skeleton height="1.2em" width="60%" />
      </div>
    </div>
  );
}

/** The cards, busy while a provider loads. */
export function MarketCards({
  loading,
  children,
}: {
  loading: boolean;
  children: ReactNode;
}) {
  return (
    // Gap 10, wrapping (line 345).
    <div aria-busy={loading || undefined} className="flex flex-wrap gap-2.5">
      {children}
    </div>
  );
}
