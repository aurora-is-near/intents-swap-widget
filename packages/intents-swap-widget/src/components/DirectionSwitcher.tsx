import * as Icons from 'lucide-react';

import { cn } from '@/utils/cn';

type Props = {
  isEnabled: boolean;
  isLoading?: boolean;
  onClick?: () => void;
};

export const DirectionSwitcher = ({
  isEnabled,
  isLoading = false,
  onClick,
}: Props) => {
  return (
    <div
      onClick={isEnabled && !isLoading ? onClick : undefined}
      className={cn(
        'bg-sw-gray-950 mt-sw-xs group absolute top-1/2 left-1/2 flex h-[40px] w-[40px] -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-sw-md text-sw-gray-100 transition-all duration-150',
        {
          'cursor-pointer hover:scale-110 hover:text-sw-gray-50 hover:bg-sw-gray-700':
            isEnabled && !isLoading,
        },
      )}>
      {isLoading ? (
        <div className="group relative inline-block">
          <Icons.RefreshCw className="h-sw-2xl w-sw-2xl animate-spin opacity-50 text-sw-accent-500" />
        </div>
      ) : (
        <div className="group relative inline-block">
          <Icons.ArrowDown
            className={cn(
              'h-sw-2xl w-sw-2xl transition-transform duration-300',
              {
                'group-hover:rotate-180': isEnabled && !isLoading,
              },
            )}
          />
        </div>
      )}
    </div>
  );
};
