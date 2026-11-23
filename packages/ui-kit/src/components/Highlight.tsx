import { forwardRef, type HTMLAttributes } from 'react';

import { cn } from '../lib/cn';

export type HighlightProps = HTMLAttributes<HTMLSpanElement>;

/** The lime word mark in a heading (Web-Borrow.dc.html line 199). */
export const Highlight = forwardRef<HTMLSpanElement, HighlightProps>(
  ({ className, ...props }, ref) => (
    <span
      ref={ref}
      className={cn(
        'inline-block rounded-[12px] bg-accent px-[12px] text-onlime',
        className,
      )}
      {...props}
    />
  ),
);

Highlight.displayName = 'Highlight';
