import { type ClassValue, clsx } from 'clsx';
import { extendTailwindMerge } from 'tailwind-merge';

/**
 * tailwind-merge only knows Tailwind's default font sizes, so it would read
 * the kit's `text-h64` as a text colour and drop it next to `text-ink`.
 * Register the type-scale tokens from theme.css as font sizes.
 */
const twMerge = extendTailwindMerge({
  extend: {
    theme: {
      text: ['h64', 'h56', 'h44', 'big'],
    },
  },
});

export const cn = (...inputs: ClassValue[]) => twMerge(clsx(inputs));
