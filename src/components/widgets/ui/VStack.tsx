import type { PropsWithChildren } from 'react';

import { cn } from '@/utils/cn';

type Props = PropsWithChildren<{
  className?: string;
  gap: 'xxs' | 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';
}>;

export const VStack = ({ children, className, gap }: Props) => {
  return (
    <div className={cn('flex flex-col', [`gap-sw-${gap}`], className)}>
      {children}
    </div>
  );
};
