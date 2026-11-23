import { Checkbox as CheckboxPrimitive } from '@base-ui/react/checkbox';
import { forwardRef, type ReactNode } from 'react';

import { cn } from '../lib/cn';
import { FOCUS_RING } from '../lib/focusRing';
import { CONTROL_LABEL } from './labels';
import { CheckIcon } from './icons';

/**
 * `.cb` (Web-Borrow.dc.html lines 139–140; focus ring as on `.tgl`, line
 * 52). No disabled `.cb` on the artboards: it takes `.go:disabled`'s opacity
 * (line 57).
 */
const BOX = `box-border inline-flex size-[24px] shrink-0 cursor-pointer items-center justify-center rounded-[7px] border-2 border-solid border-mid bg-sf p-0 data-checked:border-ink data-checked:bg-ink data-disabled:cursor-not-allowed data-disabled:opacity-50 ${FOCUS_RING}`;

/** The check (line 313): 14px, stroke 2.2, in the accent colour (#C9EB8A). */
const INDICATOR = 'flex text-accent';

/** The artboards have no indeterminate look, so `indeterminate` is left out. */
export type CheckboxProps = Omit<
  CheckboxPrimitive.Root.Props,
  'className' | 'children' | 'render' | 'nativeButton' | 'indeterminate'
> & {
  /**
   * A visible label, rendered as a `<label>` row around the checkbox.
   * Without one, pass `aria-label` or `aria-labelledby`.
   */
  label?: ReactNode;
  /** Classes for the box. */
  className?: string;
};

/**
 * A checkbox (role `checkbox`) on Base UI's `Checkbox`. Space toggles it,
 * and so does a click on its label.
 */
export const Checkbox = forwardRef<HTMLElement, CheckboxProps>(
  ({ label, className, ...props }, ref) => {
    const control = (
      <CheckboxPrimitive.Root
        ref={ref}
        className={cn(BOX, className)}
        {...props}>
        <CheckboxPrimitive.Indicator className={INDICATOR}>
          <CheckIcon />
        </CheckboxPrimitive.Indicator>
      </CheckboxPrimitive.Root>
    );

    if (label == null) {
      return control;
    }

    return (
      <label className={CONTROL_LABEL}>
        {control}
        <span>{label}</span>
      </label>
    );
  },
);

Checkbox.displayName = 'Checkbox';
