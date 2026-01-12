import { PropsWithChildren } from 'react';
import { useTheme } from '../hooks/useTheme';
import { cn } from '../utils';

export const BaseContainer = ({ children }: PropsWithChildren) => {
  const theme = useTheme();

  return (
    <div
      className={cn(
        'relative w-auto mx-auto',
        theme?.showContainer
          ? 'max-w-[496px] sm:w-[496px] p-csw-2xl bg-sw-container rounded-sw-lg'
          : 'max-w-[456px] sm:w-[456px]',
      )}>
      {children}
    </div>
  );
};
