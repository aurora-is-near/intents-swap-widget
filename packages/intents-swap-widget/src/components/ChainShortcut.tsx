import type { ComponentProps } from 'react';

import { AllNetworksIcon } from './AllNetworksIcon';

import { cn } from '@/utils/cn';
import { UNKNOWN_ICON } from '@/icons';
import { Icon } from '@/components/Icon';
import { useTypedTranslation } from '@/localisation';

type Props = {
  label: string;
  isSelected: boolean;
  icon: ComponentProps<typeof Icon>['icon'];
  onClick: () => void;
};

const Shortcut = ({ icon, label, isSelected, onClick }: Props) => {
  return (
    <li
      onClick={onClick}
      className={cn(
        'w-[36px] h-[36px] p-sw-md rounded-sw-md cursor-pointer items-center justify-center flex transition-colors',
        {
          'bg-sw-gray-50': isSelected,
          'bg-sw-gray-800 hover:bg-sw-gray-700': !isSelected,
        },
      )}>
      <Icon size={20} radius={6} icon={icon ?? UNKNOWN_ICON} label={label} />
    </li>
  );
};

const AllChainsShortcut = ({
  isSelected,
  onClick,
}: {
  isSelected: boolean;
  onClick: () => void;
}) => {
  const { t } = useTypedTranslation();

  return (
    <div
      onClick={onClick}
      className={cn(
        'px-sw-lg gap-sw-sm flex h-[36px] cursor-pointer items-center rounded-sw-md text-sw-label-md transition-colors',
        {
          'bg-sw-gray-50 text-sw-gray-950': isSelected,
          'bg-sw-gray-800 text-sw-gray-50 bg-sw-gray-800 hover:bg-sw-gray-700':
            !isSelected,
        },
      )}>
      <AllNetworksIcon />
      {t('chain.all.label', 'All')}
    </div>
  );
};

export const ChainShortcut = Object.assign(Shortcut, {
  All: AllChainsShortcut,
});
