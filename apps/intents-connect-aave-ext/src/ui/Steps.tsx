import type { ReactNode } from 'react';

type Step = {
  /** Unique within the list. */
  id: string;
  title: ReactNode;
  detail?: ReactNode;
};

/**
 * A how-to in a few numbered steps, read top to bottom: a vertical rail
 * joins the numbers. Instructions, not progress: no step is current.
 */
export const Steps = ({
  label,
  steps,
}: {
  /** Names the list for screen readers, e.g. "How a transfer works". */
  label: string;
  steps: readonly Step[];
}) => (
  <ol aria-label={label} className="flex flex-col">
    {steps.map((step, index) => (
      <li
        key={step.id}
        className="relative grid grid-cols-[24px_minmax(0,1fr)] gap-x-3 pb-4 last:pb-0">
        {index < steps.length - 1 ? (
          <span
            aria-hidden="true"
            className="absolute top-7 bottom-1 left-[11.5px] w-px bg-track-strong"
          />
        ) : null}
        <span
          aria-hidden="true"
          className="flex h-6 w-6 items-center justify-center rounded-full bg-track text-xs font-medium text-text-secondary">
          {index + 1}
        </span>
        <div className="min-w-0 pt-0.5">
          <p className="font-medium">{step.title}</p>
          {step.detail ? (
            <div className="mt-1 text-text-secondary">{step.detail}</div>
          ) : null}
        </div>
      </li>
    ))}
  </ol>
);
