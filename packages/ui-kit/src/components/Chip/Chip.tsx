import { type ButtonHTMLAttributes, forwardRef } from 'react';

import { cn } from '../../utils/cn';

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
 * rows above a token list. `.chip` (Web-Borrow.dc.html lines 26–28, markup
 * lines 234 and 239). No disabled `.chip` on the artboards: it takes
 * `.go:disabled`'s opacity (line 57) and the not-allowed cursor (line 16),
 * with no hover, as Button.
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
      className={cn(
        'box-border inline-flex cursor-pointer disabled:cursor-not-allowed disabled:opacity-50 items-center gap-1.5 rounded-full border-1.5 border-solid border-bd2 bg-sf px-3 py-1.5 font-sans text-13 leading-font font-semibold text-ink enabled:hover:border-ink aria-pressed:border-ink aria-pressed:bg-ink aria-pressed:text-sf focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-ink focus-visible:outline-solid',
        className,
      )}
      type={type}
      {...props}>
      {/* The leading 7px colour dot (line 239). */}
      {dotColor ? (
        <span
          aria-hidden="true"
          className="inline-block size-1.75 shrink-0 rounded-full"
          style={{ background: dotColor }}
        />
      ) : null}
      {children}
    </button>
  ),
);

Chip.displayName = 'Chip';
