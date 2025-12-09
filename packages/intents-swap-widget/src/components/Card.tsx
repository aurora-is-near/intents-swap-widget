import type { HTMLAttributes, PropsWithChildren } from 'react';

import { cn } from '@/utils/cn';

type Tags = 'section' | 'div' | 'ul' | 'li';

type Props = Partial<
  Omit<
    HTMLAttributes<HTMLElement>,
    'onClick' | 'role' | 'onKeyDown' | 'className' | 'tabIndex'
  >
> &
  PropsWithChildren<
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
  ...htmlAttrs
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
        'rounded-sw-lg bg-sw-gray-900',
        {
          'cursor-pointer hover:bg-sw-gray-800': isClickable,
          'p-sw-2xl': padding === 'default',
        },
        className,
      )}
      {...htmlAttrs}>
      {children}
    </Component>
  );
};
