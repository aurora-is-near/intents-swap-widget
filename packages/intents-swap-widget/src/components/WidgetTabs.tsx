import { cn } from '../utils';

export type WidgetTab = 'swap' | 'deposit' | 'withdraw' | 'topup';

type Props = {
  tabs: WidgetTab[];
  activeTab: WidgetTab | null;
  onSelect: (tab: WidgetTab) => void;
};

export const WidgetTabs = ({ tabs, activeTab, onSelect }: Props) => {
  if (tabs.length < 2) {
    return <span className="w-full" />;
  }

  return (
    <nav className="space-x-[10px] w-full">
      {tabs.map((tab) => {
        const isActive = activeTab === tab;

        return (
          <button
            key={tab}
            onClick={() => onSelect(tab)}
            className={cn(
              'rounded-sw-md text-sw-label-md cursor-pointer py-[10px] px-sw-lg',
              isActive
                ? 'bg-sw-gray-50 text-sw-gray-950'
                : 'bg-transparent text-sw-gray-200',
            )}>
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        );
      })}
    </nav>
  );
};
