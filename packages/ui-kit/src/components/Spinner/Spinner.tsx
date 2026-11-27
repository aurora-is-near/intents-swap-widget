import { forwardRef, type HTMLAttributes } from 'react';

import { cn } from '../../utils/cn';

const TONE_CLASSES = {
  default: 'border-bd border-t-ink',
  /** Follows the text colour, for use inside a button. */
  current: 'border-current/25 border-t-current',
} as const;

export type SpinnerTone = keyof typeof TONE_CLASSES;

export type SpinnerProps = HTMLAttributes<HTMLSpanElement> & {
  /** Width and height in px: 22 by default, 20 in a position row (line 1005). */
  size?: number;
  tone?: SpinnerTone;
  /** The accessible name announced by the status role. */
  label?: string;
};

/**
 * `.spin` (Web-Borrow.dc.html line 161), on Tailwind's own `spin` keyframes
 * (the artboard's, line 160, are the same).
 */
export const Spinner = forwardRef<HTMLSpanElement, SpinnerProps>(
  (
    {
      size = 22,
      tone = 'default',
      label = 'Loading',
      className,
      style,
      ...props
    },
    ref,
  ) => (
    <span
      ref={ref}
      aria-label={label}
      className={cn(
        'box-border inline-block shrink-0 rounded-full border-3 border-solid animate-spin-fast',
        TONE_CLASSES[tone],
        className,
      )}
      role="status"
      style={{ width: size, height: size, ...style }}
      {...props}
    />
  ),
);

Spinner.displayName = 'Spinner';
