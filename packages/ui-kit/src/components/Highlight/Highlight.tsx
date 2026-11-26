import { forwardRef, type HTMLAttributes } from 'react';

import { cn } from '../../utils/cn';

export type HighlightProps = HTMLAttributes<HTMLSpanElement>;

/** The lime word mark in a heading (Web-Borrow.dc.html line 199). */
export const Highlight = forwardRef<HTMLSpanElement, HighlightProps>(
  ({ className, ...props }, ref) => (
    <span
      ref={ref}
      className={cn(
        'inline-block rounded-12 bg-accent px-3 text-onlime',
        className,
      )}
      {...props}
    />
  ),
);

Highlight.displayName = 'Highlight';
