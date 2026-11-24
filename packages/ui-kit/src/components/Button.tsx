import { type ButtonHTMLAttributes, forwardRef } from 'react';

import { cn } from '../lib/cn';
import { Spinner } from './Spinner';

/**
 * Shared by every variant: focus ring (Web-Borrow.dc.html line 52) and the
 * disabled look (lines 16, 57).
 */
const BASE =
  'box-border inline-flex cursor-pointer items-center justify-center gap-[8px] font-sans font-bold focus-visible:outline-[3px] focus-visible:outline-offset-2 focus-visible:outline-ink focus-visible:outline-solid disabled:cursor-not-allowed disabled:opacity-50';

/**
 * The browser's own button line-height, which the artboards rely on.
 * Preflight's `font: inherit` would give buttons the page's 1.5 instead.
 */
const LEADING = 'leading-[normal]';

/** A caller's own line-height: `leading-*`, or a `text-size/leading` pair. */
const SETS_LEADING = /leading-|text-\S+\//;

/** `.go` (lines 55–57). */
const GO = 'rounded-[18px]';

const VARIANT_CLASSES = {
  primary: `${GO} border-0 bg-ink text-sf`,
  // The lime variant: `.go`'s shape on the artboards' `{{accent}}`.
  accent: `${GO} border-0 bg-accent text-onlime`,
  // `.go.bad` (line 56). #E5694F has no token on the artboards.
  danger: `${GO} border-2 border-solid border-[#E5694F] bg-sf text-neg`,
  // `.seg` (lines 136–137).
  secondary:
    'rounded-full border-[1.5px] border-solid border-bd2 bg-sf px-[18px] py-[9px] text-[15px] text-ink enabled:hover:border-ink',
  // `.nv` and `.ibtn` (lines 17–18, 53–54).
  ghost:
    'rounded-[12px] border-0 bg-transparent px-[20px] py-[10px] text-[16px] text-mut enabled:hover:bg-hov',
} as const;

export type ButtonVariant = keyof typeof VARIANT_CLASSES;

/**
 * `lg` is `.go`; `md` is `.go` with `width:auto;padding:14px 26px;font-size:17px`
 * (lines 397, 510, 785). Danger's 2px border comes out of its padding, so
 * every size keeps the same outer box.
 */
const SIZE_CLASSES = {
  lg: 'w-full p-[20px] text-[19px]',
  md: 'w-auto px-[26px] py-[14px] text-[17px]',
} as const;

const DANGER_SIZE_CLASSES = {
  lg: 'p-[18px]',
  md: 'px-[24px] py-[12px]',
} as const;

export type ButtonSize = keyof typeof SIZE_CLASSES;

const SIZED_VARIANTS: readonly ButtonVariant[] = [
  'primary',
  'accent',
  'danger',
];

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  /** Applies to `primary`, `accent` and `danger`. */
  size?: ButtonSize;
  /** Disables the button, sets `aria-busy` and shows a spinner. */
  loading?: boolean;
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = 'primary',
      size = 'lg',
      loading = false,
      disabled,
      type = 'button',
      className,
      children,
      ...props
    },
    ref,
  ) => {
    const sized = SIZED_VARIANTS.includes(variant);

    return (
      <button
        ref={ref}
        aria-busy={loading || undefined}
        className={cn(
          BASE,
          VARIANT_CLASSES[variant],
          sized && SIZE_CLASSES[size],
          variant === 'danger' && DANGER_SIZE_CLASSES[size],
          // After the font size: tailwind-merge drops a `leading-*` that a
          // later `text-*` size follows.
          LEADING,
          className,
          // Again after className, which may set a font size of its own,
          // unless the caller chose a line-height.
          !SETS_LEADING.test(className ?? '') && LEADING,
        )}
        disabled={(disabled ?? false) || loading}
        type={type}
        {...props}>
        {loading && <Spinner size={20} tone="current" />}
        {children}
      </button>
    );
  },
);

Button.displayName = 'Button';
