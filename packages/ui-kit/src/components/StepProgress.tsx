import { forwardRef, type OlHTMLAttributes, type ReactNode } from 'react';

import { cn } from '../lib/cn';
import { CrossIcon, DoneIcon } from './icons';
import { Spinner } from './Spinner';

/*
 * The modal's transaction steps (Web-Borrow.dc.html lines 1001–1011; row
 * colours from the script, line 1520).
 */

export type StepStatus = 'done' | 'active' | 'failed' | 'waiting';

export type Step = {
  label: ReactNode;
  status: StepStatus;
};

/** Line 1001: `display:flex; flex-direction:column; gap:12px`, as a list. */
const LIST = 'm-0 flex list-none flex-col gap-[12px] p-0 font-sans';

/**
 * Line 1003: `display:flex; align-items:center; gap:12px; font-size:15px`,
 * label `font-weight:600` (line 1008).
 */
const ROW =
  'flex items-center gap-[12px] text-[15px] leading-[normal] font-semibold';

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
 * Line 1007: 24px circle, `border:1.5px solid var(--mid)`, the step number
 * at 12px / 700 `mut2`.
 */
const WAITING =
  'box-border inline-flex size-[24px] shrink-0 items-center justify-center rounded-full border-[1.5px] border-solid border-mid text-[12px] leading-[normal] font-bold text-mut2';

/** The status icon for each step, by status. All are decorative. */
const STEP_ICONS: Record<StepStatus, (index: number) => ReactNode> = {
  // Line 1004: the circle is `--badge` through the theme rule (line 171).
  done: () => <DoneIcon className="shrink-0 text-badge" />,
  // Line 1005: `.spin` at 20px with a 2px margin. Hidden: the row's hidden
  // text names the status, not the spinner's own status role.
  active: () => (
    <span aria-hidden="true" className="inline-flex shrink-0">
      <Spinner className="m-[2px]" size={20} />
    </span>
  ),
  // Line 1006: `#A8321F`, the same in both themes on the artboard.
  failed: () => <CrossIcon className="shrink-0" color="#A8321F" />,
  // Line 1007: the step's number in the outlined circle.
  waiting: (index) => (
    <span aria-hidden="true" className={WAITING}>
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
 * status text. The active step carries `aria-current="step"`.
 */
export const StepProgress = forwardRef<HTMLOListElement, StepProgressProps>(
  ({ steps, className, ...props }, ref) => (
    <ol ref={ref} className={cn(LIST, className)} {...props}>
      {steps.map((step, index) => (
        <li
          // Steps are positional: their order is their identity.
          key={index}
          aria-current={step.status === 'active' ? 'step' : undefined}
          className={cn(ROW, ROW_TONE[step.status])}>
          {STEP_ICONS[step.status](index)}
          <span className="sr-only">{STATUS_TEXT[step.status]}: </span>
          <span>{step.label}</span>
        </li>
      ))}
    </ol>
  ),
);

StepProgress.displayName = 'StepProgress';
