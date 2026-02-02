import clsx from 'clsx';
import {
  Listbox,
  ListboxButton,
  ListboxOption,
  ListboxOptions,
} from '@headlessui/react';
import { ChevronLeftW700 as Chevron } from '@material-symbols-svg/react-rounded/icons/chevron-left';
import { CheckCircleFillW700 as Check } from '@material-symbols-svg/react-rounded/icons/check-circle';

import { maskApiKey } from '../utils';

import type { ApiKey } from '@/api/types';

type Props = {
  keys: ApiKey[];
  selected: ApiKey;
  onChange: (key: ApiKey) => void;
};

export const ApiKeySelect = ({ keys, selected, onChange }: Props) => {
  return (
    <div className="relative w-full">
      <Listbox value={selected} onChange={onChange}>
        {({ open }) => (
          <>
            <ListboxButton
              className={clsx(
                'relative outline-none flex items-center justify-between w-full rounded-csw-md bg-csw-gray-800 pl-csw-xl pr-csw-lg py-csw-lg text-csw-label-md text-csw-gray-50 cursor-pointer transition-colors hover:bg-csw-gray-700',
                'focus:bg-csw-gray-700',
              )}>
              {maskApiKey(selected.widgetAppKey)}
              <Chevron
                size={20}
                className={open ? 'rotate-90' : '-rotate-90'}
              />
            </ListboxButton>
            <ListboxOptions
              transition
              modal={false}
              portal={false}
              className="absolute rounded-csw-md bg-csw-gray-800 py-1 shadow-lg z-10 focus:outline-none w-full mt-csw-lg p-csw-2md">
              {keys.map((appKey) => (
                <ListboxOption
                  value={appKey}
                  key={appKey.widgetAppKey}
                  className="group flex cursor-pointer items-center justify-between gap-csw-md rounded-csw-md p-csw-2md transition-colors hover:bg-csw-gray-700">
                  <div className="text-csw-label-md text-csw-gray-50">
                    {maskApiKey(appKey.widgetAppKey)}
                  </div>
                  <Check
                    size={20}
                    className="invisible group-data-selected:visible text-csw-status-success"
                  />
                </ListboxOption>
              ))}
            </ListboxOptions>
          </>
        )}
      </Listbox>
    </div>
  );
};
