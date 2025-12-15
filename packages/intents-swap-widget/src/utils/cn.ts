import clsx from 'clsx';
import { extendTailwindMerge } from 'tailwind-merge';
import type { ClassValue } from 'clsx';

const twMerge = extendTailwindMerge({
  extend: {
    classGroups: {
      'font-size': [
        'text-sw-label-sm',
        'text-sw-label-md',
        'text-sw-label-lg',
        'text-sw-body-sm',
        'text-sw-body-md',
        'text-sw-body-lg',
        'text-sw-value-lg',
      ],
    },
  },
});

export const cn = (...inputs: ClassValue[]) => twMerge(clsx(inputs));
