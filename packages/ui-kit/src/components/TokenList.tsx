import {
  type ButtonHTMLAttributes,
  forwardRef,
  type HTMLAttributes,
} from 'react';

import { cn } from '../lib/cn';
import { FOCUS_RING } from '../lib/focusRing';
import { TokenMark } from './TokenMark';

/** A token as the list and the select show it: display-ready strings only. */
export type TokenOption = {
  /** What `onValueChange` / `onClick` callers identify the token by. */
  id: string;
  /** Such as `ETH`. */
  symbol: string;
  /** The round mark: letters with colours, or a logo. */
  mark: { label: string; bg?: string; fg?: string; src?: string };
  /** Such as `Ethereum · Base · Arbitrum`; ellipsised when too long. */
  chainsLabel: string;
  /** Such as `$3,120.40`. */
  priceLabel: string;
};

/**
 * `.list` (Web-Borrow.dc.html line 33): a column, gap 2px, max height 236px,
 * scrolls. The artboard's 10px top margin separates it from the filter
 * chips; TokenSelect adds it when there are filters.
 */
const LIST = 'flex max-h-[236px] flex-col gap-[2px] overflow-y-auto';

/**
 * `.row` (lines 29–31, markup line 245): gap 12, padding 8px 10px, radius
 * 12, transparent 1.5px border; hover `hov`; selected `tint` with a `limebd`
 * border. Focus ring as on line 20. Disabled: `.go:disabled`'s opacity
 * (line 57) and the not-allowed cursor (line 16), with no hover, as Button.
 */
const ROW = `box-border flex w-full cursor-pointer disabled:cursor-not-allowed disabled:opacity-50 items-center gap-[12px] rounded-[12px] border-[1.5px] border-solid border-transparent bg-transparent px-[10px] py-[8px] text-left font-sans text-ink enabled:hover:bg-hov aria-pressed:border-limebd aria-pressed:bg-tint ${FOCUS_RING}`;

/** Symbol and chains (line 246): `flex:1; min-width:0; line-height:1.25`. */
const NAMES = 'min-w-0 flex-1 leading-[1.25]';

/** Line 246: 16px / 700. */
const SYMBOL = 'text-[16px] font-bold';

/** Line 246: 12px `mut2`, one line with an ellipsis. */
const CHAINS = 'truncate text-[12px] text-mut2';

/** Line 247: 14px / 600. */
const PRICE = 'shrink-0 text-[14px] font-semibold';

export type TokenListProps = HTMLAttributes<HTMLDivElement>;

/**
 * The scrolling column that holds `TokenRow`s. Name it with `aria-label`
 * when it is not inside a named popup.
 */
export const TokenList = forwardRef<HTMLDivElement, TokenListProps>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn(LIST, className)} {...props} />
  ),
);

TokenList.displayName = 'TokenList';

export type TokenRowProps = Omit<
  ButtonHTMLAttributes<HTMLButtonElement>,
  'children' | 'aria-pressed'
> & {
  option: TokenOption;
  /** Whether this is the chosen token; sets `aria-pressed`. */
  selected?: boolean;
};

/**
 * One token in a `TokenList`: a plain button (reached with Tab) showing the
 * mark, symbol, chains and price. Its accessible name is that text; the mark
 * is decorative.
 */
export const TokenRow = forwardRef<HTMLButtonElement, TokenRowProps>(
  ({ option, selected = false, className, type = 'button', ...props }, ref) => (
    <button
      ref={ref}
      aria-pressed={selected}
      className={cn(ROW, className)}
      type={type}
      {...props}>
      {/* Line 245: 34px, letters 13px / 800. */}
      <TokenMark
        alt=""
        aria-hidden="true"
        bg={option.mark.bg}
        className="text-[13px]"
        fg={option.mark.fg}
        label={option.mark.label}
        size={34}
        src={option.mark.src}
      />
      <span className={NAMES}>
        <span className={cn('block', SYMBOL)}>{option.symbol}</span>
        <span className={cn('block', CHAINS)}>{option.chainsLabel}</span>
      </span>
      <span className={PRICE}>{option.priceLabel}</span>
    </button>
  ),
);

TokenRow.displayName = 'TokenRow';
