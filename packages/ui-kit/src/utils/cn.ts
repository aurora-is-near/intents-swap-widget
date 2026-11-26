import { type ClassValue, clsx } from 'clsx';
import { extendTailwindMerge } from 'tailwind-merge';

/**
 * tailwind-merge only knows Tailwind's default theme, so it would read the
 * kit's `text-h64` or `text-14` as a text colour and drop it next to
 * `text-ink`, and not see `rounded-18` and `rounded-full` as one property.
 * Register the scale tokens from theme.css (cn.test.ts checks the lists
 * match it).
 */
const twMerge = extendTailwindMerge({
  extend: {
    theme: {
      text: [
        'h64',
        '10',
        '11',
        '12',
        '13',
        '14',
        '15',
        '16',
        '17',
        '18',
        '19',
        '24',
        '26',
        '28',
        '30',
        '34',
      ],
      radius: ['2', '5', '7', '8', '12', '14', '16', '18', '24', '28'],
      leading: ['font', '1.02', '1.1', '1.15', '1.2', '1.45'],
      tracking: ['display', 'figure', 'title', 'label'],
      shadow: ['popup', 'dialog', 'ink-ring'],
      animate: ['spin-fast'],
    },
  },
});

export const cn = (...inputs: ClassValue[]) => twMerge(clsx(inputs));
