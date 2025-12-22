import {
  Close,
  Emergency,
  ErrorFill,
  VerifiedFill,
} from '@material-symbols-svg/react-rounded/w700';
import { useMemo } from 'react';

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
  const icon = useMemo(() => {
    switch (variant) {
      case 'success':
        return <VerifiedFill size={16} />;
      case 'error':
        return <ErrorFill size={16} />;
      case 'warn':
      default:
        return <Emergency size={16} />;
    }
  }, [variant]);

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
          <Close size={16} />
        </div>
      )}
    </div>
  );
};
