import * as Icons from 'lucide-react';

import { cn } from '@/utils/cn';

type Props = {
  message: string;
  multiline?: boolean;
  variant: 'error' | 'warn' | 'success';
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
        'gap-sw-md relative flex items-center',
        {
          'text-sw-status-error': variant === 'error',
          'text-sw-status-warning': variant === 'warn',
          'text-sw-status-success': variant === 'success',
        },
        className,
      )}>
      {!multiline && icon}
      <span
        className={cn('text-sw-label-sm', {
          'text-nowrap': !multiline,
        })}>
        {message}
      </span>
      {onDismiss && (
        <div
          onClick={onDismiss}
          className="ml-auto flex cursor-pointer items-center justify-center transition-all hover:scale-125">
          <Icons.X size={16} strokeWidth={2.5} />
        </div>
      )}
    </div>
  );
};
