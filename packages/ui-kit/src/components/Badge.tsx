import { forwardRef, type HTMLAttributes } from 'react';

import { cn } from '../lib/cn';

/** Values from Web-Borrow.dc.html. */
const VARIANT_CLASSES = {
  // The chip in the Borrow button (line 372).
  best: 'rounded-[7px] bg-accent px-[10px] py-[1px] text-onlime',
  // `.meta` (line 157).
  neutral:
    'inline-flex items-center gap-[8px] rounded-full bg-sf2 px-[12px] py-[6px] text-[14px] font-semibold',
  // The count pill in a segment (lines 210, 699).
  count: 'rounded-full bg-accent px-[8px] text-[13px] text-onlime',
} as const;

export type BadgeVariant = keyof typeof VARIANT_CLASSES;

export type BadgeProps = HTMLAttributes<HTMLSpanElement> & {
  variant: BadgeVariant;
};

export const Badge = forwardRef<HTMLSpanElement, BadgeProps>(
  ({ variant, className, ...props }, ref) => (
    <span
      ref={ref}
      className={cn(VARIANT_CLASSES[variant], className)}
      {...props}
    />
  ),
);

Badge.displayName = 'Badge';
