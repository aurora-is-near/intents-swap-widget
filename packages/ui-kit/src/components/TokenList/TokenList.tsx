import {
  type ButtonHTMLAttributes,
  forwardRef,
  type HTMLAttributes,
} from 'react';

import { cn } from '../../utils/cn';
import { ScrollArea } from '../ScrollArea/ScrollArea';
import { TokenMark } from '../TokenMark/TokenMark';

/** A token as the list and the select show it: display-ready strings only. */
export type TokenOption = {
  /** What `onValueChange` / `onClick` callers identify the token by. */
  id: string;
  /** Such as `ETH`. */
  symbol: string;
  /** The round mark: letters with colours, or a logo. */
  mark: { label: string; bg?: string; fg?: string; src?: string };
  /**
   * Such as `Ethereum · Base · Arbitrum`; ellipsised when too long, the full
   * list in its tooltip.
   */
  chainsLabel: string;
  /** Such as `$3,120.40`. Shown when there is no `balanceLabel`. */
  priceLabel: string;
  /**
   * A held balance, such as `1.25`. When set, the right-hand slot shows
   * it (with `balanceUsdLabel` under it) in place of `priceLabel`.
   */
  balanceLabel?: string;
  /** The balance's value, such as `$3,900.50`; only with `balanceLabel`. */
  balanceUsdLabel?: string;
  /**
   * Why the token can't be picked, such as `Not supported yet`. When set,
   * the row is disabled and the reason comes before the chains label, so a
   * long chain list is what gets ellipsised, not the reason.
   */
  unavailableReason?: string;
};

export type TokenListProps = HTMLAttributes<HTMLDivElement>;

/**
 * The scrolling column that holds `TokenRow`s, in the kit's `ScrollArea`.
 * Name it with `aria-label` when it is not inside a named popup;
 * `className` and the other props go on the scroll area's root.
 *
 * `.list` (Web-Borrow.dc.html line 33): a column with a 2px gap, at most
 * 236px tall, scrolling. The artboard's 10px top margin separates it from
 * the filter chips; TokenSelect adds it when there are filters. The
 * scrollbar is pulled 10px out to the right (`-mr-2.5`), into the 12px
 * padding a host such as TokenSelect's popup gives the list, so it sits 2px
 * from the popup's border and never over a row.
 */
export const TokenList = forwardRef<HTMLDivElement, TokenListProps>(
  ({ children, ...props }, ref) => (
    <ScrollArea
      ref={ref}
      scrollbarClassName="my-1 -mr-2.5"
      viewportClassName="max-h-59 rounded-12"
      {...props}>
      <div className="flex flex-col gap-0.5">{children}</div>
    </ScrollArea>
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
 * mark, symbol, chains and price, or the balance and its USD value when the
 * option has a `balanceLabel`. Its accessible name is that text; the mark is
 * decorative. An option with an `unavailableReason` is disabled, and the
 * reason is part of the name.
 *
 * `.row` (Web-Borrow.dc.html lines 29–31, markup line 245): selected is
 * `tint` with a `limebd` border. Disabled: `.go:disabled`'s opacity (line 57)
 * and the not-allowed cursor (line 16), with no hover, as Button.
 */
export const TokenRow = forwardRef<HTMLButtonElement, TokenRowProps>(
  (
    {
      option,
      selected = false,
      disabled,
      className,
      type = 'button',
      ...props
    },
    ref,
  ) => (
    <button
      ref={ref}
      aria-pressed={selected}
      className={cn(
        'box-border flex w-full cursor-pointer disabled:cursor-not-allowed disabled:opacity-50 items-center gap-3 rounded-12 border-1.5 border-solid border-transparent bg-transparent px-2.5 py-2 text-left font-sans text-ink enabled:hover:bg-hov aria-pressed:border-limebd aria-pressed:bg-tint focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-ink focus-visible:outline-solid',
        className,
      )}
      disabled={disabled ?? option.unavailableReason !== undefined}
      type={type}
      {...props}>
      {/* Line 245: 34px, letters 13px / 800. */}
      <TokenMark
        alt=""
        aria-hidden="true"
        bg={option.mark.bg}
        className="text-13"
        fg={option.mark.fg}
        label={option.mark.label}
        size={34}
        src={option.mark.src}
      />
      {/* Symbol and chains (line 246), each one line: a squeezed symbol
          ellipsises instead of running under the price. */}
      <span className="min-w-0 flex-1 leading-tight">
        <span className="block truncate text-16 font-bold">
          {option.symbol}
        </span>
        <span
          className="block truncate text-12 text-mut2"
          title={option.chainsLabel}>
          {option.unavailableReason === undefined
            ? option.chainsLabel
            : `${option.unavailableReason} · ${option.chainsLabel}`}
        </span>
      </span>
      {option.balanceLabel === undefined ? (
        // Line 247: 14px / 600.
        <span className="shrink-0 text-14 font-semibold">
          {option.priceLabel}
        </span>
      ) : (
        // A balance in the price's place: the price's type, right-aligned,
        // with its USD value under it in the chains line's type.
        <span className="shrink-0 text-right leading-tight">
          <span className="block shrink-0 text-14 font-semibold">
            {option.balanceLabel}
          </span>
          {option.balanceUsdLabel === undefined ? null : (
            <span className="block text-12 text-mut2">
              {option.balanceUsdLabel}
            </span>
          )}
        </span>
      )}
    </button>
  ),
);

TokenRow.displayName = 'TokenRow';
