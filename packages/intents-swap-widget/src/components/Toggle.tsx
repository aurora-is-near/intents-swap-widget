import { Switch } from '@headlessui/react';

import { cn } from '@/utils/cn';

type Props = {
  isOn: boolean;
  isDisabled?: boolean;
  className?: string;
  onToggle: (value: boolean) => void;
};

export const Toggle = ({ isOn, isDisabled, className, onToggle }: Props) => {
  return (
    <Switch
      checked={isOn}
      disabled={isDisabled}
      onChange={onToggle}
      className={cn(
        'group inline-flex h-sw-xl w-[28px] items-center rounded-full transition bg-sw-gray-300 data-checked:bg-sw-accent-300 cursor-pointer',
        { 'opacity-50': isDisabled },
        className,
      )}>
      <span className="size-sw-lg translate-x-sw-xxs rounded-full bg-sw-gray-950 transition group-data-checked:translate-x-[14px]" />
    </Switch>
  );
};
