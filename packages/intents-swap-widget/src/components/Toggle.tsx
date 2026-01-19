import { Switch } from '@headlessui/react';

import { cn } from '@/utils/cn';

type Props = {
  isOn: boolean;
  className?: string;
  onToggle: (value: boolean) => void;
};

export const Toggle = ({ isOn, className, onToggle }: Props) => {
  return (
    <Switch
      checked={isOn}
      onChange={onToggle}
      className={cn(
        'group inline-flex h-sw-xl w-[28px] items-center rounded-full transition bg-sw-gray-300 data-checked:bg-sw-accent-300 cursor-pointer',
        className,
      )}>
      <span className="size-sw-lg translate-x-sw-xxs rounded-full bg-sw-gray-950 transition group-data-checked:translate-x-[14px]" />
    </Switch>
  );
};
