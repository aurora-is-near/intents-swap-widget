import { ScheduleFillW700 as Schedule } from '@material-symbols-svg/react-rounded/icons/schedule';

import { cn } from '@/utils/cn';

type Props = {
  isActive: boolean;
  pendingCount: number;
  onClick: () => void;
};

export const WidgetHistoryButton = ({
  isActive,
  pendingCount,
  onClick,
}: Props) => (
  <button
    type="button"
    onClick={onClick}
    className={cn(
      'relative px-sw-md cursor-pointer transition-colors',
      isActive ? 'text-sw-gray-50' : 'text-sw-gray-200 hover:text-sw-gray-50',
    )}>
    <Schedule className="w-sw-2xl h-sw-2xl" />
    {pendingCount > 0 && (
      <span className="absolute -top-[8px] right-[0px] flex items-center justify-center min-w-[16px] h-[16px] rounded-full bg-sw-accent-500 text-sw-gray-950 text-sw-label-sm border-2 border-sw-gray-950">
        {pendingCount}
      </span>
    )}
  </button>
);
