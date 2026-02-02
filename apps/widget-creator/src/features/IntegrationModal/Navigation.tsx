import { clsx } from 'clsx';
import { Button as UIButton } from '@headlessui/react';

type NavigationItemProps = {
  isActive?: boolean;
  children: React.ReactNode;
  onClick: () => void;
};

const NavigationItem = ({
  isActive,
  children,
  onClick,
}: NavigationItemProps) => (
  <UIButton
    onClick={onClick}
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

export type NavigationTabs = 'embed-code' | 'api-keys';

type Props = {
  className?: string;
  selected: NavigationTabs;
  onSelect: (selected: 'embed-code' | 'api-keys') => void;
};

export const Navigation = ({ selected, className, onSelect }: Props) => (
  <nav
    className={clsx(
      'w-full sm:w-[190px] flex-shrink-0 border-b sm:border-r border-csw-gray-900 px-csw-2xl py-csw-2xl',
      className,
    )}>
    <ul className="flex flex-row items-center sm:items-start sm:flex-col gap-csw-md">
      <li className="w-auto sm:w-full">
        <NavigationItem
          isActive={selected === 'embed-code'}
          onClick={() => onSelect('embed-code')}>
          Embed code
        </NavigationItem>
      </li>
      <li className="w-auto sm:w-full">
        <NavigationItem
          isActive={selected === 'api-keys'}
          onClick={() => onSelect('api-keys')}>
          API keys
        </NavigationItem>
      </li>
    </ul>
  </nav>
);
