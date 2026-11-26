import { createElement, forwardRef, type HTMLAttributes } from 'react';

import { cn } from '../../utils/cn';

/** Values from Web-Borrow.dc.html; the font sizes are the type-scale tokens. */
const VARIANT_CLASSES = {
  // line 198
  h64: 'text-h64 font-extrabold leading-1.02 tracking-display',
  // .lbl, line 145
  label: 'text-12 tracking-label text-mut2',
} as const;

export type TextVariant = keyof typeof VARIANT_CLASSES;

/** The element each variant renders: the hero heading, or a label block. */
const ELEMENT = { h64: 'h1', label: 'div' } as const;

export type TextProps = HTMLAttributes<HTMLElement> & {
  variant: TextVariant;
};

export const Text = forwardRef<HTMLElement, TextProps>(
  ({ variant, className, ...props }, ref) => {
    // createElement, because JSX over a union of tags narrows the ref to
    // the intersection of every element type.
    return createElement(ELEMENT[variant], {
      ...props,
      ref,
      className: cn('m-0', VARIANT_CLASSES[variant], className),
    });
  },
);

Text.displayName = 'Text';
