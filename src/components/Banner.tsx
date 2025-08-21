import * as Icons from 'lucide-react';

import { cn } from '@/utils/cn';

type Props = {
  message: string;
  variant: 'error' | 'warn' | 'info' | 'success';
  className?: string;
  onDismiss?: () => void;
};

export const Banner = ({ variant, message, className, onDismiss }: Props) => {
  return (
    <div
      className={cn(
        'gap-ds-md px-ds-lg py-ds-md relative flex items-center rounded-md',
        {
          'bg-warn-900 text-warn-100': variant === 'warn',
          'bg-mauve-800 text-mauve-100': variant === 'info',
          'bg-alert-900 text-alert-100': variant === 'error',
          'bg-success-900 text-success-100': variant === 'success',
        },
        className,
      )}>
      {variant === 'success' ? (
        <Icons.CheckCircle size={16} />
      ) : (
        <Icons.CircleAlert size={16} />
      )}
      <span className="text-label-s text-nowrap">{message}</span>
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
