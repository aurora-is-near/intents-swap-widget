import clsx from 'clsx';
import { extendTailwindMerge } from 'tailwind-merge';
import type { ClassValue } from 'clsx';

const twMerge = extendTailwindMerge({
  extend: {
    classGroups: {
      'font-size': [
        'text-csw-label-s',
        'text-csw-label-m',
        'text-csw-label-l',
        'text-csw-h1',
        'text-csw-h2',
        'text-csw-h3',
        'text-csw-h4',
        'text-csw-p-s',
        'text-csw-p-m',
        'text-csw-display',
      ],
    },
  },
});

export const cn = (...inputs: ClassValue[]) => twMerge(clsx(inputs));
