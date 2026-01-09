import { CloseW700 as Close } from '@material-symbols-svg/react-rounded/icons/close';
import { EmergencyW700 as Emergency } from '@material-symbols-svg/react-rounded/icons/emergency';
import { ErrorFillW700 as ErrorFill } from '@material-symbols-svg/react-rounded/icons/error';
import { VerifiedFillW700 as VerifiedFill } from '@material-symbols-svg/react-rounded/icons/verified';
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
