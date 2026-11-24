import { createElement, forwardRef, type HTMLAttributes } from 'react';

import { cn } from '../lib/cn';

/** Values from Web-Borrow.dc.html; the font sizes are the type-scale tokens. */
const VARIANT_CLASSES = {
  // line 198
  h64: 'text-h64 font-extrabold leading-[1.02] tracking-[-0.04em]',
  // line 694
  h56: 'text-h56 font-extrabold leading-[1.05] tracking-[-0.04em]',
  // line 812
  h44: 'text-h44 font-extrabold leading-[1.05] tracking-[-0.04em]',
  // lines 576, 607
  big: 'text-big font-semibold leading-[1.25] tracking-[-0.03em]',
  // .lbl, line 145
  label: 'text-[12px] tracking-[0.14em] text-mut2',
} as const;

export type TextVariant = keyof typeof VARIANT_CLASSES;

export type TextElement =
  | 'h1'
  | 'h2'
  | 'h3'
  | 'h4'
  | 'h5'
  | 'h6'
  | 'p'
  | 'span'
  | 'div'
  | 'label'
  | 'legend';

const DEFAULT_ELEMENT: Record<TextVariant, TextElement> = {
  h64: 'h1',
  h56: 'h2',
  h44: 'h3',
  big: 'p',
  label: 'div',
};

export type TextProps = HTMLAttributes<HTMLElement> & {
  variant: TextVariant;
  /** The element to render; defaults by variant (h1/h2/h3, p, div). */
  as?: TextElement;
};

export const Text = forwardRef<HTMLElement, TextProps>(
  ({ variant, as, className, ...props }, ref) => {
    // createElement, because JSX over a union of tags narrows the ref to
    // the intersection of every element type.
    return createElement(as ?? DEFAULT_ELEMENT[variant], {
      ...props,
      ref,
      className: cn('m-0', VARIANT_CLASSES[variant], className),
    });
  },
);

Text.displayName = 'Text';
