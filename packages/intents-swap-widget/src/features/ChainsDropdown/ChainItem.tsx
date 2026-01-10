import React from 'react';
import { CheckFillW700 as Check } from '@material-symbols-svg/react-rounded/icons/check';

import { cn } from '@/utils/cn';
import { Icon } from '@/components/Icon';
import type { Chains } from '@/types/chain';

type Msg = { type: 'on_click_chain'; chain: 'intents' | 'all' | Chains };

type Props = {
  label: string;
  isFocused: boolean;
  isSelected: boolean;
  chain: 'intents' | 'all' | Chains;
  icon: string | React.ReactElement;
  iconClassName?: string;
  className?: string;
  onMsg: (msg: Msg) => void;
};

export const ChainItem = React.forwardRef<HTMLButtonElement, Props>(
  (
    {
      chain,
      label,
      icon,
      iconClassName,
      isFocused,
      isSelected,
      className,
      onMsg,
    },
    ref,
  ) => (
    <button
      ref={ref}
      type="button"
      onClick={() => onMsg({ type: 'on_click_chain', chain })}
      className={cn(
        'gap-sw-md px-sw-lg py-sw-sm text-sw-gray-50 flex cursor-pointer items-center justify-between rounded-sw-md transition-colors',
        { 'bg-sw-gray-700': isSelected || isFocused },
        {
          'hover:text-sw-accent-200 hover:bg-sw-gray-700':
            !isSelected && !isFocused,
        },
        className,
      )}>
      <Icon radius={10} label={label} icon={icon} className={iconClassName} />
      <span className="text-sw-label-md mr-auto">{label}</span>
      {isSelected && <Check size={16} className="text-sw-status-success" />}
    </button>
  ),
);
