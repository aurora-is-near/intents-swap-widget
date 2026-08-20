import { clsx } from 'clsx';
import type { PropsWithChildren } from 'react';

type Props = PropsWithChildren<{
  state?: 'error' | 'warning';
}>;

export const StatusMessage = ({ state = 'error', children }: Props) => (
  <div className="flex items-center justify-center">
    <p
      className={clsx('text-sw-label-sm max-w-[80%] text-center', {
        'text-sw-status-error': state === 'error',
        'text-sw-status-warning': state === 'warning',
      })}>
      {children}
    </p>
  </div>
);
