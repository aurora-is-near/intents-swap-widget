import HistoryIcon from 'reicon-react/icons/BillList';

import { cn } from '@/utils/cn';

type Props = {
  isActive: boolean;
  pendingTransactionsCount: number;
  onClick: () => void;
};

export const WidgetHistoryButton = ({
  isActive,
  pendingTransactionsCount,
  onClick,
}: Props) => (
  <button
    type="button"
    onClick={onClick}
    className={cn(
      'relative p-sw-sm cursor-pointer transition-colors rounded-sw-md',
      isActive
        ? 'text-sw-gray-50'
        : 'text-sw-gray-300 hover:text-sw-gray-50 hover:bg-sw-gray-800',
    )}>
    <HistoryIcon weight="Filled" className="h-sw-2xl w-sw-2xl" />
    {pendingTransactionsCount > 0 && (
      <span className="absolute -top-[8px] right-[0px] flex items-center justify-center min-w-[16px] h-[16px] rounded-full bg-sw-accent-500 text-sw-gray-950 text-sw-label-sm border-2 border-sw-gray-950">
        {pendingTransactionsCount}
      </span>
    )}
  </button>
);
