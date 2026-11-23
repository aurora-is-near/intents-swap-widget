import { Switch as SwitchPrimitive } from '@base-ui/react/switch';
import { forwardRef, type ReactNode } from 'react';

import { cn } from '../lib/cn';
import { FOCUS_RING } from '../lib/focusRing';
import { CONTROL_LABEL } from './labels';

/**
 * `.tgl` (Web-Borrow.dc.html lines 61–62, focus ring line 52). No disabled
 * `.tgl` on the artboards: it takes `.go:disabled`'s opacity (line 57).
 */
const TRACK = `relative box-border inline-block h-[28px] w-[46px] shrink-0 cursor-pointer rounded-[14px] border-0 bg-mid2 p-0 data-checked:bg-ink data-disabled:cursor-not-allowed data-disabled:opacity-50 ${FOCUS_RING}`;

/**
 * `.tgl span` (lines 63–64). The artboard's checked thumb is #C9EB8A, the
 * `--accent` token's value.
 */
const THUMB =
  'absolute top-[3px] left-[3px] size-[22px] rounded-full bg-sf data-checked:left-[21px] data-checked:bg-accent';

export type SwitchProps = Omit<
  SwitchPrimitive.Root.Props,
  'className' | 'children' | 'render' | 'nativeButton'
> & {
  /**
   * A visible label, rendered as a `<label>` row around the switch. Without
   * one, pass `aria-label` or `aria-labelledby`.
   */
  label?: ReactNode;
  /** Classes for the switch track. */
  className?: string;
};

/**
 * An on/off switch (role `switch`) on Base UI's `Switch`. Space toggles it,
 * and so does a click on its label.
 */
export const Switch = forwardRef<HTMLElement, SwitchProps>(
  ({ label, className, ...props }, ref) => {
    const control = (
      <SwitchPrimitive.Root
        ref={ref}
        className={cn(TRACK, className)}
        {...props}>
        <SwitchPrimitive.Thumb className={THUMB} />
      </SwitchPrimitive.Root>
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

Switch.displayName = 'Switch';
