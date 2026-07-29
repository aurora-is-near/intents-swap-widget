import LoaderIcon from 'reicon-react/icons/Loader';
import ArrowDownIcon from 'reicon-react/icons/ArrowDown';

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
    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex items-center justify-center w-[48px] h-[48px] bg-sw-gray-950 rounded-[14px]">
      <div
        onClick={isEnabled && !isLoading ? onClick : undefined}
        className={cn(
          'bg-sw-gray-900 group flex h-[40px] w-[40px] items-center justify-center rounded-sw-md text-sw-gray-100 transition-all duration-150',
          {
            'cursor-pointer hover:scale-105 hover:text-sw-gray-50 hover:bg-sw-gray-700':
              isEnabled && !isLoading,
          },
        )}>
        {isLoading ? (
          <div className="group relative inline-block text-sw-accent-500">
            <LoaderIcon
              weight="Filled"
              className="h-sw-2xl w-sw-2xl animate-spin opacity-50"
            />
          </div>
        ) : (
          <div className="group relative inline-block">
            <ArrowDownIcon
              weight="Outline"
              strokeWidth={3}
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
    </div>
  );
};
