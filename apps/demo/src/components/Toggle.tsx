import { clsx } from 'clsx';
import { Field, Label, Switch } from '@headlessui/react';

type Props = {
  className?: string;
  isDisabled?: boolean;
  onToggle: (value: boolean) => void;
  isOn: boolean;
  label: string;
};

export const Toggle = ({
  className,
  label,
  isDisabled,
  isOn,
  onToggle,
}: Props) => {
  return (
    <Field
      disabled={isDisabled}
      className={clsx(
        'gap-sw-sm flex cursor-pointer items-center',
        {
          'text-sw-gray-100': isDisabled,
          'text-sw-gray-100 hover:text-sw-gray-50': !isDisabled,
        },
        className,
      )}>
      <Switch
        checked={isOn}
        onChange={onToggle}
        className={clsx(
          'group h-[18px] p-sw-xxs data-checked:bg-green-300 inline-flex w-[28px] items-center rounded-full transition',
          {
            'cursor-pointer bg-gray-600': !isDisabled,
            'bg-gray-700': isDisabled,
          },
        )}>
        <span className="bg-gray-900 size-[12px] group-data-checked:bg-green-950 group-data-checked:translate-x-[13px] translate-x-[3px] rounded-full transition" />
      </Switch>
      {!!label && (
        <Label className="text-sw-label-md cursor-pointer">{label}</Label>
      )}
    </Field>
  );
};
