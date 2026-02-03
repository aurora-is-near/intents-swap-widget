import { cn } from '../utils';

const TABS = ['swap', 'deposit', 'withdraw'] as const;

export type WidgetTab = (typeof TABS)[number];

type Props = {
  activeTab: WidgetTab;
  hasAccountAbstraction: boolean;
  onSelect: (tab: WidgetTab) => void;
};

export const WidgetTabs = ({
  activeTab,
  hasAccountAbstraction,
  onSelect,
}: Props) => {
  const tabs = hasAccountAbstraction
    ? TABS
    : TABS.filter((tab) => tab !== 'withdraw');

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
