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
          'ring-1': detail === 'outlined',
          'py-ds-xs px-ds-sm': size === 'sm',
          'py-ds-sm px-ds-md': size === 'md',

          // gray
          'text-gray-50 ring-gray-500': variant === 'gray',
          'bg-gray-600': variant === 'gray' && detail === 'dimmed',
          'hover:bg-gray-800':
            isClickable && variant === 'gray' && detail === 'outlined',

          // primary
          'ring-mauve-300 text-mauve-300': variant === 'primary',
          'bg-mauve-700': variant === 'primary' && detail === 'dimmed',
          'hover:bg-mauve-700':
            isClickable && variant === 'primary' && detail === 'outlined',

          // alert
          'bg-alert-900 text-alert-100': variant === 'alert',
          'ring-alert-100': detail === 'outlined' && variant === 'alert',

          // success
          'bg-success-900 text-success-100': variant === 'success',
          'ring-success-100': detail === 'outlined' && variant === 'success',
        },
        className,
      )}>
      <span className="gap-ds-sm text-label-s flex items-center text-nowrap">
        {children}
      </span>
    </div>
  );
};
