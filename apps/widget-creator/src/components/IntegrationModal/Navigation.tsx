import { clsx } from 'clsx';
import { Button as UIButton } from '@headlessui/react';

type NavigationItemProps = {
  children: React.ReactNode;
  isActive?: boolean;
};

const NavigationItem = ({ isActive, children }: NavigationItemProps) => (
  <UIButton
    className={clsx(
      'w-full items-start transition-colors rounded-csw-md px-csw-lg py-csw-2md text-csw-label-md cursor-pointer text-left',
      {
        'bg-csw-gray-50 text-csw-gray-950': isActive,
        'bg-csw-gray-950 hover:bg-csw-gray-800 text-csw-gray-50': !isActive,
      },
    )}>
    {children}
  </UIButton>
);

export const Navigation = () => (
  <nav className="w-[190px] flex-shrink-0 border-r border-csw-gray-900 px-csw-2xl py-csw-2xl">
    <ul className="flex flex-col gap-csw-xs">
      <li>
        <NavigationItem isActive>Embed code</NavigationItem>
      </li>
    </ul>
  </nav>
);
