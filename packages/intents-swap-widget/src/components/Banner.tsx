import * as Icons from 'lucide-react';

import { cn } from '@/utils/cn';

type Props = {
  message: string;
  multiline?: boolean;
  variant: 'error' | 'warn' | 'info' | 'success';
  className?: string;
  onDismiss?: () => void;
};

export const Banner = ({
  variant,
  multiline,
  message,
  className,
  onDismiss,
}: Props) => {
  const icon =
    variant === 'success' ? (
      <Icons.CheckCircle size={16} />
    ) : (
      <Icons.CircleAlert size={16} />
    );

  return (
    <div
      className={cn(
        'gap-sw-md px-sw-lg py-sw-md relative flex items-center rounded-sw-md',
        {
          'bg-sw-warn-900 text-sw-warn-100': variant === 'warn',
          'bg-sw-mauve-800 text-sw-mauve-100': variant === 'info',
          'bg-sw-alert-900 text-sw-alert-100': variant === 'error',
          'bg-sw-success-900 text-sw-success-100': variant === 'success',
        },
        className,
      )}>
      {!multiline && icon}
      <span
        className={cn('text-sw-label-s', {
          'text-nowrap': !multiline,
          'leading-[18px]': multiline,
        })}>
        {message}
      </span>
      {onDismiss && (
        <div
          onClick={onDismiss}
          className="ml-auto flex cursor-pointer items-center justify-center transition-all hover:scale-125">
          <Icons.X size={12} strokeWidth={3} />
        </div>
      )}
    </div>
  );
};
