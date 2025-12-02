import { clsx } from 'clsx';
import type { PropsWithChildren } from 'react';
import type { LucideIcon } from 'lucide-react';

import { WalletConnectButton } from './WalletConnectButton';

type TabProps<T> = {
  id: T;
  label: string;
  icon: LucideIcon;
  isActive: boolean;
  onClick: (id: T) => void;
};

const Tab = <T extends string>({
  id,
  label,
  isActive,
  icon: Icon,
  onClick,
}: TabProps<T>) => (
  <button
    key={id}
    onClick={() => onClick(id)}
    type="button"
    className={clsx(
      'flex gap-2 items-center cursor-pointer rounded-xl p-3 sm:px-4 group transition-colors',
      {
        'bg-gray-200': isActive,
        'bg-sw-gray-900 text-gray-400 hover:text-gray-200': !isActive,
      },
    )}>
    <Icon
      className={clsx('w-[16px] h-[16px]', {
        'text-gray-900': isActive,
        'text-gray-400 group-hover:text-gray-200': !isActive,
      })}
      strokeWidth={2.5}
    />
    <span className="text-sm hidden sm:inline-block!">{label}</span>
  </button>
);

type Props<T> = {
  activeTab: T;
  tabs: ReadonlyArray<Omit<TabProps<T>, 'isActive' | 'onClick'>>;
  onClick: (id: T) => void;
};

const Header = ({ children }: PropsWithChildren) => (
  <header className="z-1 fixed top-0 left-0 w-full flex justify-between items-center gap-3 py-3 px-4 bg-[#24262c]">
    {children ?? <span />}
    <WalletConnectButton />
  </header>
);

const Nav = <T extends string>({ tabs, activeTab, onClick }: Props<T>) => (
  <nav className="flex gap-2 sm:gap-3 items-center">
    {tabs.map((tab) => (
      <Tab
        {...tab}
        key={tab.id}
        isActive={activeTab === tab.id}
        onClick={onClick}
      />
    ))}
  </nav>
);

export const PageHeader = Object.assign(Header, {
  Nav,
});
