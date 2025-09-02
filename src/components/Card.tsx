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

  return (
    <Component
      onClick={onClick}
      className={cn(
        'rounded-sw-lg bg-sw-gray-900',
        {
          'cursor-pointer hover:bg-sw-gray-800': isClickable,
          'p-sw-2xl': padding === 'default',
        },
        className,
      )}>
      {children}
    </Component>
  );
};
