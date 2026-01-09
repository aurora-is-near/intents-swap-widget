import type { ComponentProps } from 'react';

import { UNKNOWN_ICON } from '@/icons';
import { Icon } from '@/components/Icon';

type Props = {
  icon: ComponentProps<typeof Icon>['icon'];
  label: string;
};

export const ChainShortcut = ({ icon, label }: Props) => {
  return (
    <li className="w-[36px] h-[36px] p-sw-md rounded-sw-md bg-sw-gray-800 hover:bg-sw-gray-700 cursor-pointer items-center justify-center flex transition-colors">
      <Icon icon={icon ?? UNKNOWN_ICON} label={label} />
    </li>
  );
};
