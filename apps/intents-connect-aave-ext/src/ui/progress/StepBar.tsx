import { AlertIcon, CheckIcon, cx } from '../ui';

/**
 * Segmented progress: steps before `current` done, `current` in progress
 * (pulsing) or, when `halted`, stopped (red, with a mark).
 */
export const StepBar = ({
  steps,
  current,
  complete,
  halted,
}: {
  steps: readonly string[];
  current: number;
  /** Every step done. */
  complete: boolean;
  halted: boolean;
}) => {
  return (
    <ol
      aria-label="Supply progress"
      className="grid gap-1.5"
      style={{
        gridTemplateColumns: `repeat(${steps.length}, minmax(0, 1fr))`,
      }}>
      {steps.map((label, index) => {
        const done = index < current || complete;
        const active = index === current && !done;
        let state = 'not started';

        if (done) {
          state = 'done';
        } else if (active) {
          state = halted ? 'stopped' : 'in progress';
        }

        return (
          <li
            key={label}
            aria-current={active ? 'step' : undefined}
            className="flex min-w-0 flex-col gap-1.5">
            <span
              className={cx(
                'h-1 rounded-full',
                done && 'bg-text-primary',
                active && !halted && 'animate-pulse bg-text-primary/45',
                active && halted && 'bg-danger',
                !done && !active && 'bg-track-strong',
              )}
            />
            {/* Done and stopped show by a mark, not only the bar's colour. */}
            <span
              className={cx(
                'flex min-w-0 items-center gap-0.5 text-xs',
                done || active ? 'text-text-secondary' : 'text-text-muted',
              )}>
              {done ? <CheckIcon size={10} /> : null}
              {active && halted ? (
                <span className="text-danger">
                  <AlertIcon size={10} />
                </span>
              ) : null}
              <span className="truncate">{label}</span>
              <span className="sr-only">: {state}</span>
            </span>
          </li>
        );
      })}
    </ol>
  );
};
