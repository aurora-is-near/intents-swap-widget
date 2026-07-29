import SettingsIcon from 'reicon-react/icons/Settings2';

import { cn } from '@/utils/cn';

type Props = {
  isActive: boolean;
  onClick: () => void;
};

export const WidgetSettingsButton = ({ isActive, onClick }: Props) => (
  <button
    type="button"
    onClick={onClick}
    className={cn(
      'relative p-sw-sm cursor-pointer transition-colors rounded-sw-md',
      isActive
        ? 'text-sw-gray-50'
        : 'text-sw-gray-300 hover:text-sw-gray-50 hover:bg-sw-gray-800',
    )}>
    <SettingsIcon weight="Filled" className="h-sw-2xl w-sw-2xl" />
  </button>
);
