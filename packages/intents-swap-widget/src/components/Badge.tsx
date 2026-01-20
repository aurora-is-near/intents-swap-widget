import type { PropsWithChildren } from 'react';

import { cn } from '@/utils/cn';

type Props = PropsWithChildren<{
  size?: 'sm' | 'md';
  className?: string;
  isClickable?: boolean;
  onClick?: () => void;
}>;

export const Badge = ({
  size = 'sm',
  isClickable,
  onClick,
  className,
  children,
}: Props) => (
  <div
    onClick={isClickable ? onClick : undefined}
    className={cn(
      'ml-auto flex items-center justify-center rounded-full transition-colors',
      {
        'py-[3px] px-sw-sm': size === 'sm',
        'py-sw-sm px-sw-md': size === 'md',
        'bg-sw-gray-800 text-sw-gray-200': !isClickable,
        'bg-sw-gray-800 text-sw-gray-200 hover:bg-sw-gray-700 cursor-pointer':
          isClickable,
      },
      className,
    )}>
    <span className="gap-sw-sm text-sw-label-sm flex items-center text-nowrap">
      {children}
    </span>
  </div>
);
