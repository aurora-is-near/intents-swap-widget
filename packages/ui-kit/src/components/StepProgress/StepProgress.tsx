import { forwardRef, type OlHTMLAttributes, type ReactNode } from 'react';

import { cn } from '../../utils/cn';
import { CrossIcon, DoneIcon } from '../icons/icons';
import { Spinner } from '../Spinner/Spinner';

/*
 * The modal's transaction steps (Web-Borrow.dc.html lines 1001–1011; row
 * colours from the script, line 1520).
 */

export type StepStatus = 'done' | 'active' | 'failed' | 'waiting';

export type Step = {
  label: ReactNode;
  status: StepStatus;
};

/*
 * Gaps and the waiting circle are in rem (Tailwind's grid); text sizes (the
 * kit's px scale), the SVG icons and all borders are in px.
 */

/** Line 1520: failed rows are `neg`, waiting rows `mut2`, the rest `ink`. */
const ROW_TONE: Record<StepStatus, string> = {
  done: 'text-ink',
  active: 'text-ink',
  failed: 'text-neg',
  waiting: 'text-mut2',
};

/** Screen-reader text for each status, read before the label. */
const STATUS_TEXT: Record<StepStatus, string> = {
  done: 'Done',
  active: 'In progress',
  failed: 'Failed',
  waiting: 'Waiting',
};

/**
 * The status icon for each step, by status. All are decorative. A step's
 * outcome (done or failed) fades in from 90% over 200ms when it replaces the
 * spinner; reduced motion only fades. The spinner and the number swap in
 * place: one already moves, the other is where every step starts.
 */
const STEP_ICONS: Record<StepStatus, (index: number) => ReactNode> = {
  // Line 1004: the circle is `--badge` through the theme rule (line 171).
  done: () => (
    <DoneIcon
      className={cn(
        'shrink-0 text-badge',
        'transition-[opacity,scale] duration-200 ease-out starting:scale-90 starting:opacity-0 motion-reduce:starting:scale-100',
      )}
    />
  ),
  // Line 1005: `.spin` at 20px with a 2px margin. Hidden: the row's hidden
  // text names the status, not the spinner's own status role.
  active: () => (
    <span aria-hidden="true" className="inline-flex shrink-0">
      <Spinner className="m-0.5" size={20} />
    </span>
  ),
  // Line 1006: `#A8321F`, the same in both themes on the artboard.
  failed: () => (
    <CrossIcon
      className={cn(
        'shrink-0',
        'transition-[opacity,scale] duration-200 ease-out starting:scale-90 starting:opacity-0 motion-reduce:starting:scale-100',
      )}
      color="#A8321F"
    />
  ),
  // Line 1007: the step's number in a 24px `mid`-outlined circle, 12px / 700.
  waiting: (index) => (
    <span
      aria-hidden="true"
      className="box-border inline-flex size-6 shrink-0 items-center justify-center rounded-full border-1.5 border-solid border-mid text-12 leading-font font-bold text-mut2">
      {index + 1}
    </span>
  ),
};

export type StepProgressProps = Omit<
  OlHTMLAttributes<HTMLOListElement>,
  'children'
> & {
  steps: readonly Step[];
};

/**
 * An ordered list of transaction steps, each with a status icon and hidden
 * status text. The active step carries `aria-current="step"`. List and rows
 * as on lines 1001 and 1003 (label weight from line 1008).
 */
export const StepProgress = forwardRef<HTMLOListElement, StepProgressProps>(
  ({ steps, className, ...props }, ref) => (
    <ol
      ref={ref}
      className={cn(
        'm-0 flex list-none flex-col gap-3 p-0 font-sans',
        className,
      )}
      {...props}>
      {steps.map((step, index) => (
        <li
          // Steps are positional: their order is their identity.
          key={index}
          aria-current={step.status === 'active' ? 'step' : undefined}
          className={cn(
            'flex items-center gap-3 text-15 leading-font font-semibold',
            ROW_TONE[step.status],
          )}>
          {STEP_ICONS[step.status](index)}
          <span className="sr-only">{STATUS_TEXT[step.status]}: </span>
          <span>{step.label}</span>
        </li>
      ))}
    </ol>
  ),
);

StepProgress.displayName = 'StepProgress';
