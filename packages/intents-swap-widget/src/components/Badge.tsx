import { forwardRef } from 'react';
import type { ComponentPropsWithoutRef } from 'react';

import { cn } from '@/utils/cn';

type Props = Omit<ComponentPropsWithoutRef<'div'>, 'onClick'> & {
  isClickable?: boolean;
  onClick?: () => void;
};

// Forwards its ref and spreads the remaining props so it can be handed straight
// to a Radix `asChild` trigger. Radix merges a ref and pointer handlers onto the
// child element, and a child that swallows them just silently never triggers.
export const Badge = forwardRef<HTMLDivElement, Props>(
  ({ isClickable, onClick, className, children, ...rest }, ref) => (
    <div
      ref={ref}
      {...rest}
      role={isClickable ? 'button' : undefined}
      tabIndex={isClickable ? 0 : undefined}
      onKeyDown={
        isClickable
          ? (e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onClick?.();
              }
            }
          : undefined
      }
      onClick={isClickable ? onClick : undefined}
      className={cn(
        'ml-auto flex items-center justify-center rounded-full transition-colors py-sw-xs px-sw-md',
        {
          'bg-sw-gray-950 text-sw-gray-200': !isClickable,
          'bg-sw-gray-950 text-sw-gray-200 hover:bg-sw-gray-800 hover:-translate-y-px cursor-pointer transition':
            isClickable,
        },
        className,
      )}>
      <span className="gap-sw-sm text-sw-label-sm flex items-center text-nowrap">
        {children}
      </span>
    </div>
  ),
);

Badge.displayName = 'Badge';
