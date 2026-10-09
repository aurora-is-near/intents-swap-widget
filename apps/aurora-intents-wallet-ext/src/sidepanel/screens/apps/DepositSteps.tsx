import { cn } from '@aurora-is-near/intents-swap-widget/utils';

import { Icon, Spinner } from '../../components/Icon';

type StepState = 'done' | 'active' | 'todo' | 'failed';

const StepIcon = ({ state }: { state: StepState }) => {
  switch (state) {
    case 'done':
      return (
        <span className="flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-full bg-sw-status-success text-sw-gray-950">
          <Icon name="check" size={12} />
        </span>
      );
    case 'failed':
      return (
        <span className="flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-full bg-sw-status-error text-sw-gray-950">
          <Icon name="close" size={12} />
        </span>
      );
    case 'active':
      return <Spinner size={18} />;
    default:
      return (
        <span className="m-[2px] block h-[14px] w-[14px] shrink-0 rounded-full shadow-[inset_0_0_0_2px_var(--color-sw-gray-600)]" />
      );
  }
};

/** An app deposit's progress: one row per stage, as in the design. */
export const DepositSteps = ({
  steps,
}: {
  steps: Array<{ label: string; state: StepState }>;
}) => (
  <div className="flex shrink-0 flex-col rounded-sw-lg bg-sw-gray-900 p-sw-xl">
    <ol className="m-0 flex list-none flex-col gap-sw-md p-[0px]">
      {steps.map(({ label, state }) => (
        <li key={label} className="flex items-center gap-sw-md">
          <StepIcon state={state} />
          <span
            className={cn(
              'text-sw-label-sm',
              state === 'todo' ? 'text-sw-gray-400' : 'text-sw-gray-50',
            )}>
            {label}
          </span>
        </li>
      ))}
    </ol>
  </div>
);

/** States for `labels`, with the one at `active` in progress. */
export const stepStates = (
  labels: string[],
  active: number,
  isFailed = false,
): Array<{ label: string; state: StepState }> =>
  labels.map((label, index) => {
    if (index < active) {
      return { label, state: 'done' };
    }

    if (index === active) {
      return { label, state: isFailed ? 'failed' : 'active' };
    }

    return { label, state: 'todo' };
  });
