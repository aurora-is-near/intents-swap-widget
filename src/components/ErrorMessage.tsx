import clsx from 'clsx';
import type { PropsWithChildren } from 'react';

type Props = {
  variant?: 'alert' | 'dimmed';
};

export const ErrorMessage = ({
  variant = 'alert',
  children,
}: PropsWithChildren<Props>) => {
  return (
    <div className="flex items-center justify-center">
      <p
        className={clsx('text-p-xs max-w-[80%] text-center', {
          'text-alert-100': variant === 'alert',
          'text-gray-300': variant === 'dimmed',
        })}>
        {children}
      </p>
    </div>
  );
};
