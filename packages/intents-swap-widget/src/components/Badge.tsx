import type { PropsWithChildren } from 'react';

import { cn } from '@/utils/cn';

type Props = PropsWithChildren<{
  size?: 'sm' | 'md';
  variant?: 'gray' | 'primary' | 'alert' | 'success';
  detail?: 'dimmed' | 'outlined';
  className?: string;
  isClickable?: boolean;
  onClick?: () => void;
}>;

export const Badge = ({
  size = 'sm',
  variant = 'gray',
  detail = 'outlined',
  isClickable,
  onClick,
  className,
  children,
}: Props) => {
  return (
    <div
      onClick={isClickable ? onClick : undefined}
      className={cn(
        'ml-auto flex items-center justify-center rounded-full',
        {
          // common
          'cursor-pointer': isClickable,
          'ring-1 ring-inset': detail === 'outlined',
          'py-sw-xs px-sw-sm': size === 'sm',
          'py-sw-sm px-sw-md': size === 'md',

          // gray
          'text-sw-gray-50 ring-sw-gray-500': variant === 'gray',
          'bg-sw-gray-600': variant === 'gray' && detail === 'dimmed',
          'hover:bg-sw-gray-800':
            isClickable && variant === 'gray' && detail === 'outlined',

          // primary
          'ring-sw-mauve-300 text-sw-mauve-300': variant === 'primary',
          'bg-sw-mauve-700': variant === 'primary' && detail === 'dimmed',
          'hover:bg-sw-mauve-700':
            isClickable && variant === 'primary' && detail === 'outlined',

          // alert
          'bg-sw-alert-900 text-sw-alert-100': variant === 'alert',
          'ring-sw-alert-100': detail === 'outlined' && variant === 'alert',

          // success
          'bg-sw-success-900 text-sw-success-100': variant === 'success',
          'ring-sw-success-100': detail === 'outlined' && variant === 'success',
        },
        className,
      )}>
      <span className="gap-sw-sm text-sw-label-s flex items-center text-nowrap">
        {children}
      </span>
    </div>
  );
};
