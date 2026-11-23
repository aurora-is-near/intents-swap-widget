import { type ButtonHTMLAttributes, forwardRef } from 'react';

import { cn } from '../lib/cn';
import { FOCUS_RING } from '../lib/focusRing';

/**
 * `.chip` (Web-Borrow.dc.html lines 26–28, markup lines 234 and 239): pill,
 * gap 6px, padding 6px 12px, border 1.5px `bd2`, `sf`, 13px / 600; hover
 * border ink; selected `ink` with `sf` text. The line-height is the browser's
 * button `normal`, after the font size (see Button). Focus ring as on line 20.
 */
const CHIP = `box-border inline-flex cursor-pointer disabled:cursor-not-allowed items-center gap-[6px] rounded-full border-[1.5px] border-solid border-bd2 bg-sf px-[12px] py-[6px] font-sans text-[13px] leading-[normal] font-semibold text-ink hover:border-ink aria-pressed:border-ink aria-pressed:bg-ink aria-pressed:text-sf ${FOCUS_RING}`;

/**
 * The leading colour dot (line 239): 7px circle. Shared with TokenSelect's
 * chain dot (line 221).
 */
export const DOT = 'inline-block size-[7px] shrink-0 rounded-full';

export type ChipProps = Omit<
  ButtonHTMLAttributes<HTMLButtonElement>,
  'aria-pressed'
> & {
  /** Whether the chip is selected; sets `aria-pressed`. */
  pressed?: boolean;
  /** A leading 7px dot in this colour, such as a chain's colour. */
  dotColor?: string;
};

/**
 * A filter chip: a toggle button (`aria-pressed`) shaped as a pill, used in
 * rows above a token list.
 */
export const Chip = forwardRef<HTMLButtonElement, ChipProps>(
  (
    {
      pressed = false,
      dotColor,
      className,
      type = 'button',
      children,
      ...props
    },
    ref,
  ) => (
    <button
      ref={ref}
      aria-pressed={pressed}
      className={cn(CHIP, className)}
      type={type}
      {...props}>
      {dotColor ? (
        <span
          aria-hidden="true"
          className={DOT}
          style={{ background: dotColor }}
        />
      ) : null}
      {children}
    </button>
  ),
);

Chip.displayName = 'Chip';
