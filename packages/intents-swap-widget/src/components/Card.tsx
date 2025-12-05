import type { PropsWithChildren } from 'react';

import { cn } from '@/utils/cn';

type Tags = 'section' | 'div' | 'ul' | 'li';

type Props = PropsWithChildren<
  {
    as?: Tags;
    className?: string;
    padding?: 'none' | 'default';
  } & (
    | { isClickable: true; onClick: () => void }
    | { isClickable?: false; onClick?: never }
  )
>;

export const Card = ({
  children,
  isClickable,
  onClick,
  padding = 'default',
  className,
  as = 'div',
}: Props) => {
  const Component = as;

  const handleKeyDown = isClickable
    ? (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick?.();
        }
      }
    : undefined;

  return (
    <Component
      onClick={onClick}
      onKeyDown={handleKeyDown}
      role={isClickable ? 'button' : undefined}
      tabIndex={isClickable ? 0 : undefined}
      className={cn(
        'rounded-sw-lg bg-sw-gray-900 transition-colors',
        {
          'cursor-pointer': isClickable,
          'p-sw-2xl': padding === 'default',
        },
        className,
      )}>
      {children}
    </Component>
  );
};
