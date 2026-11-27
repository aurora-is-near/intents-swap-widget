import { type ButtonHTMLAttributes, forwardRef } from 'react';

import { cn } from '../../utils/cn';
import { FOCUS_RING } from '../../utils/focusRing';
import { SEG_CLASSES } from '../../utils/segClasses';
import { Spinner } from '../Spinner/Spinner';

/**
 * Shared by every variant: focus ring (Web-Borrow.dc.html line 52) and the
 * disabled look (lines 16, 57).
 */
const BASE = `box-border inline-flex cursor-pointer items-center justify-center gap-2 font-sans font-bold ${FOCUS_RING} disabled:cursor-not-allowed disabled:opacity-50`;

/**
 * The browser's own button line-height, which the artboards rely on.
 * Preflight's `font: inherit` would give buttons the page's 1.5 instead.
 */
const LEADING = 'leading-font';

/** A caller's own line-height: `leading-*`, or a `text-size/leading` pair. */
const SETS_LEADING = /leading-|text-\S+\//;

/**
 * `.go` (lines 55–57). A press sinks it to 97% in 160ms, so the call to
 * action answers the click; reduced motion keeps only its colour states.
 */
const GO =
  'rounded-18 transition-transform duration-160 ease-out enabled:active:scale-97 motion-reduce:enabled:active:scale-100';

const VARIANT_CLASSES = {
  primary: `${GO} border-0 bg-ink text-sf`,
  // `.go.bad` (line 56). #E5694F has no token on the artboards.
  danger: `${GO} border-2 border-solid border-negbd bg-sf text-neg`,
  // `.seg` (lines 136–137), shared with `Tab`.
  secondary: SEG_CLASSES,
  // `.nv` and `.ibtn` (lines 17–18, 53–54).
  ghost:
    'rounded-12 border-0 bg-transparent px-5 py-2.5 text-16 text-mut enabled:hover:bg-hov',
  // `.linkb` (Web-Borrow-Confirm.dc.html line 159), such as a dialog's
  // "Cancel": no box, 15px / 600, underlined, `mut`.
  link: 'border-0 bg-transparent p-0 text-15 font-semibold text-mut underline',
} as const;

export type ButtonVariant = keyof typeof VARIANT_CLASSES;

/**
 * `lg` is `.go`; `md` is `.go` with `width:auto;padding:14px 26px;font-size:17px`
 * (lines 397, 510, 785). Danger's 2px border comes out of its padding, so
 * every size keeps the same outer box.
 */
const SIZE_CLASSES = {
  lg: 'w-full p-5 text-19',
  md: 'w-auto px-6.5 py-3.5 text-17',
} as const;

const DANGER_SIZE_CLASSES = {
  lg: 'p-4.5',
  md: 'px-6 py-3',
} as const;

export type ButtonSize = keyof typeof SIZE_CLASSES;

const SIZED_VARIANTS: readonly ButtonVariant[] = ['primary', 'danger'];

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  /** Applies to `primary` and `danger`. */
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
