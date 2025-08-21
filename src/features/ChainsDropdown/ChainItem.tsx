import * as Icons from 'lucide-react';

import { cn } from '@/utils/cn';
import { Icon } from '@/components/Icon';
import type { Chains } from '@/types/chain';

type Msg = { type: 'on_click_chain'; chain: 'intents' | 'all' | Chains };

type Props = {
  label: string;
  isSelected: boolean;
  chain: 'intents' | 'all' | Chains;
  icon: string | React.ReactElement;
  onMsg: (msg: Msg) => void;
};

export const ChainItem = ({ chain, label, icon, isSelected, onMsg }: Props) => {
  return (
    <button
      type="button"
      onClick={() => onMsg({ type: 'on_click_chain', chain })}
      className={cn(
        'gap-ds-md px-ds-lg py-ds-sm text-mauve-50 flex cursor-pointer items-center justify-between rounded-md transition-colors',
        { 'hover:text-mauve-200 hover:bg-gray-700': !isSelected },
        { 'bg-gray-700': isSelected },
      )}>
      <Icon noLoadedBg radius={10} variant="dark" label={label} icon={icon} />
      <span className="text-label-m mr-auto">{label}</span>
      {isSelected && <Icons.Check size={16} />}
    </button>
  );
};
