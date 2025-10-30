import clsx from 'clsx';
import { extendTailwindMerge } from 'tailwind-merge';
import type { ClassValue } from 'clsx';

const twMerge = extendTailwindMerge({
  extend: {
    classGroups: {
      'font-size': [
        'text-label-s',
        'text-label-m',
        'text-label-l',
        'text-h1',
        'text-h2',
        'text-h3',
        'text-h4',
        'text-p-s',
        'text-p-m',
        'text-display',
      ],
    },
  },
});

export const cn = (...inputs: ClassValue[]) => twMerge(clsx(inputs));
