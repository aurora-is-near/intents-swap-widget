import { forwardRef, type HTMLAttributes } from 'react';

import { cn } from '../lib/cn';
import { FOCUS_RING } from '../lib/focusRing';

/** The chip row (Web-Borrow.dc.html line 451): flex, gap 6px. */
const ROW = 'flex gap-[6px]';

/**
 * `.pct` (lines 141–143), each `flex:1` (line 451): padding 8px 14px,
 * radius 10, border 1.5px `bd2`, `sf`, 14px / 700; hover border ink;
 * selected `ink` with `sf` text. The line-height is the browser's button
 * `normal`, after the font size (see Button). Focus ring as on line 20.
 */
const CHIP = `box-border min-w-0 flex-1 cursor-pointer rounded-[10px] border-[1.5px] border-solid border-bd2 bg-sf px-[14px] py-[8px] font-sans text-[14px] leading-[normal] font-bold text-ink hover:border-ink aria-pressed:border-ink aria-pressed:bg-ink aria-pressed:text-sf ${FOCUS_RING}`;

export type QuickAmountOption = {
  /** What `onSelect` receives, such as `0.5` or `max`. */
  value: string;
  /** What the chip shows, such as `50%` or `Max`. */
  label: string;
};

export type QuickAmountsProps = Omit<
  HTMLAttributes<HTMLDivElement>,
  'onSelect'
> & {
  options: readonly QuickAmountOption[];
  /** The selected option's value; its chip is pressed. */
  value?: string;
  onSelect: (value: string) => void;
};

/**
 * A row of equal-width preset chips (25%, 50%, Max) under an amount field
 * or a slider. Each chip is a toggle button with `aria-pressed`; name the
 * row with `aria-label` (it is a `group`).
 */
export const QuickAmounts = forwardRef<HTMLDivElement, QuickAmountsProps>(
  ({ options, value, onSelect, className, ...props }, ref) => (
    <div ref={ref} className={cn(ROW, className)} role="group" {...props}>
      {options.map((option) => (
        <button
          aria-pressed={option.value === value}
          className={CHIP}
          key={option.value}
          onClick={() => onSelect(option.value)}
          type="button">
          {option.label}
        </button>
      ))}
    </div>
  ),
);

QuickAmounts.displayName = 'QuickAmounts';
