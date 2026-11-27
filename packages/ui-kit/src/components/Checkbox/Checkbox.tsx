import { Checkbox as CheckboxPrimitive } from '@base-ui/react/checkbox';
import { forwardRef, type ReactNode } from 'react';

import { cn } from '../../utils/cn';
import { CheckIcon } from '../icons/icons';

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
 * and so does a click on its label. `.cb` (Web-Borrow.dc.html lines
 * 139–140). No disabled `.cb` on the artboards: it takes `.go:disabled`'s
 * opacity (line 57).
 */
export const Checkbox = forwardRef<HTMLElement, CheckboxProps>(
  ({ label, className, ...props }, ref) => {
    const control = (
      <CheckboxPrimitive.Root
        ref={ref}
        className={cn(
          'box-border inline-flex size-6 shrink-0 cursor-pointer items-center justify-center rounded-7 border-2 border-solid border-mid bg-sf p-0 data-checked:border-ink data-checked:bg-ink data-disabled:cursor-not-allowed data-disabled:opacity-50 focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-ink focus-visible:outline-solid',
          className,
        )}
        {...props}>
        {/*
          The check (line 313): 14px, stroke 2.2, in the accent colour
          (#C9EB8A). It fades in from 90% over 120ms when ticked and back out
          when cleared; reduced motion only fades.
        */}
        <CheckboxPrimitive.Indicator className="flex text-accent transition-[opacity,scale] duration-120 ease-out data-ending-style:scale-90 data-ending-style:opacity-0 data-starting-style:scale-90 data-starting-style:opacity-0 motion-reduce:data-ending-style:scale-100 motion-reduce:data-starting-style:scale-100">
          <CheckIcon />
        </CheckboxPrimitive.Indicator>
      </CheckboxPrimitive.Root>
    );

    if (label == null) {
      return control;
    }

    return (
      <label className="inline-flex cursor-pointer items-center gap-3 font-sans text-16 text-ink has-data-disabled:cursor-not-allowed">
        {control}
        <span>{label}</span>
      </label>
    );
  },
);

Checkbox.displayName = 'Checkbox';
