import clsx from 'clsx';
import { extendTailwindMerge } from 'tailwind-merge';
import type { ClassValue } from 'clsx';

const twMerge = extendTailwindMerge({
  extend: {
    classGroups: {
      'font-size': [
        'text-sw-label-s',
        'text-sw-label-m',
        'text-sw-label-l',
        'text-sw-h1',
        'text-sw-h2',
        'text-sw-h3',
        'text-sw-h4',
        'text-sw-p-s',
        'text-sw-p-m',
        'text-sw-display',
      ],
    },
  },
});

export const cn = (...inputs: ClassValue[]) => twMerge(clsx(inputs));
