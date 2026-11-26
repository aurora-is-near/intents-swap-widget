import { forwardRef, type HTMLAttributes } from 'react';

import { cn } from '../../utils/cn';

/**
 * `.card` (Web-Borrow.dc.html line 144), 16px padding below 640px (line 134;
 * Tailwind's `max-[640px]` is `width < 640px`, unlike `mobile:`).
 * One padding utility reads a variable that changes with the breakpoint, so a
 * caller's `p-*`, `px-*` or `py-*` replaces the padding at every width.
 */
const BASE =
  'box-border rounded-24 border-1.5 border-solid border-bd bg-sf p-(--card-p) [--card-p:22px] max-[640px]:[--card-p:16px]';

export type CardProps = HTMLAttributes<HTMLDivElement>;

export const Card = forwardRef<HTMLDivElement, CardProps>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn(BASE, className)} {...props} />
  ),
);

Card.displayName = 'Card';
