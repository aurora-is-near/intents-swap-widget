import { forwardRef, type HTMLAttributes } from 'react';

import { cn } from '../lib/cn';

/**
 * `.card` (Web-Borrow.dc.html line 144), 16px padding at ≤640px (line 134).
 * One padding utility reads a variable that changes with the breakpoint, so a
 * caller's `p-*`, `px-*` or `py-*` replaces the padding at every width.
 */
const BASE =
  'box-border rounded-[24px] border-[1.5px] border-solid border-bd bg-sf p-(--card-p) [--card-p:22px] max-[640px]:[--card-p:16px]';

const VARIANT_CLASSES = {
  default: '',
  // `.best` (line 36)
  tint: 'border-limebd bg-tint',
} as const;

export type CardVariant = keyof typeof VARIANT_CLASSES;

export type CardProps = HTMLAttributes<HTMLDivElement> & {
  variant?: CardVariant;
};

export const Card = forwardRef<HTMLDivElement, CardProps>(
  ({ variant = 'default', className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(BASE, VARIANT_CLASSES[variant], className)}
      {...props}
    />
  ),
);

Card.displayName = 'Card';
