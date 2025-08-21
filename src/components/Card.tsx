import type { PropsWithChildren } from 'react';

import { cn } from '@/utils/cn';

type Tags = 'section' | 'div' | 'ul' | 'li';

type Props = PropsWithChildren<
  {
    as?: Tags;
    className?: string;
  } & (
    | { isClickable: true; onClick: () => void }
    | { isClickable?: false; onClick?: never }
  )
>;

export const Card = ({
  children,
  isClickable,
  onClick,
  className,
  as = 'div',
}: Props) => {
  const Component = as;

  return (
    <Component
      onClick={onClick}
      className={cn(
        'px-ds-2xl py-ds-xl rounded-lg bg-gray-900',
        { 'cursor-pointer hover:bg-gray-800': isClickable },
        className,
      )}>
      {children}
    </Component>
  );
};
