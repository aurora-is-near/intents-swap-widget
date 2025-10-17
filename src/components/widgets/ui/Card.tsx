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

export const WidgetCard = ({
  children,
  isClickable,
  onClick,
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
        'rounded-lg bg-sw-gray-900',
        { 'cursor-pointer hover:bg-sw-gray-800': isClickable },
        className,
      )}>
      {children}
    </Component>
  );
};
