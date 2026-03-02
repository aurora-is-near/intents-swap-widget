import { ScheduleFillW700 as Schedule } from '@material-symbols-svg/react-rounded/icons/schedule';

import { cn } from '@/utils/cn';

type Props = {
  isActive: boolean;
  onClick: () => void;
};

export const WidgetHistoryButton = ({ isActive, onClick }: Props) => (
  <button
    type="button"
    onClick={onClick}
    className={cn(
      'px-sw-md cursor-pointer transition-colors',
      isActive ? 'text-sw-gray-50' : 'text-sw-gray-200 hover:text-sw-gray-50',
    )}>
    <Schedule className="w-sw-2xl h-sw-2xl" />
  </button>
);
