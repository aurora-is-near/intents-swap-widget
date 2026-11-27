import {
  DialogDescription,
  DialogTitle,
  StepProgress,
} from '@aurora-is-near/ui-kit';
import type { ReactNode } from 'react';

import { StepBanner } from './StepBanner';
import { getProgressSteps } from './utils/getProgressSteps';
import { getExtraRows } from './utils/getSummary';
import type { ProgressStep } from './utils/getBorrowDialogStep';
import type { Summary, SummaryRow } from './utils/getSummary';

/**
 * Line 996: `sf2`, radius 18, padding 4px 16px; each row (line 998) padding
 * 11px 0 with a 1px `bd` top rule, 15px, the label `mut`, the value 600
 * right-aligned and wrapping anywhere (a full recipient address).
 */
function Rows({ rows }: { rows: SummaryRow[] }) {
  return (
    <dl className="m-0 mt-4 rounded-18 bg-sf2 px-4 py-1">
      {rows.map(([label, value]) => (
        <div
          key={label}
          className="flex justify-between gap-4 border-0 border-t border-solid border-bd py-2.75 text-15 leading-font">
          <dt className="shrink-0 text-mut">{label}</dt>
          <dd className="m-0 min-w-0 text-right font-semibold [overflow-wrap:anywhere]">
            {value}
          </dd>
        </div>
      ))}
    </dl>
  );
}

/** Confirm, pending, cancelling and error: the rows and the steps. */
export function ProgressContent({
  step,
  summary,
  earlierPending,
  footer,
}: {
  step: ProgressStep;
  summary: Summary;
  earlierPending: boolean;
  footer: ReactNode;
}) {
  return (
    <>
      {/* The borrow modal's copy (lines 1451–1454). */}
      <DialogTitle>Confirm loan</DialogTitle>
      <DialogDescription>
        Review the terms, then sign once in your wallet.
      </DialogDescription>
      <StepBanner
        earlierPending={earlierPending}
        errorContext={summary.errorContext}
        step={step}
      />
      {summary.rows ? (
        <Rows rows={[...summary.rows, ...getExtraRows(step)]} />
      ) : null}
      {/* Line 1001: 16px above. */}
      <StepProgress
        aria-label="Loan progress"
        className="mt-4"
        steps={getProgressSteps(summary.borrowSymbol, step)}
      />
      {footer}
    </>
  );
}
