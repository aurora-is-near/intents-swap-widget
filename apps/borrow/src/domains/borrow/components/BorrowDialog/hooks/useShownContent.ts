import { useRef } from 'react';

import { getErrorCopy } from '../utils/getErrorCopy';
import { getSummary } from '../utils/getSummary';
import type { BorrowPreviewFigures } from '../../../utils/previewFigures';
import type { BorrowDialogStep } from '../utils/getBorrowDialogStep';
import type {
  BorrowDialogLoan,
  RestoredBorrowSummary,
  Summary,
} from '../utils/getSummary';

/*
 * What the dialog shows and how it closes, from what it is opened with.
 */

/** What the dialog is opened with. */
type ShownInput = {
  step: BorrowDialogStep;
  loan: BorrowDialogLoan | undefined;
  figures: BorrowPreviewFigures | undefined;
  restored: RestoredBorrowSummary | undefined;
};

type Content = { step: BorrowDialogStep; summary: Summary };

/**
 * An error before the dry run finished (a pre-check) has no figures. A
 * restored borrow has its rows instead, and is never confirmed here.
 */
export const canShow = ({ step, loan, figures, restored }: ShownInput) =>
  loan !== undefined
    ? figures !== undefined || step.kind === 'error'
    : restored !== undefined && step.kind !== 'confirm';

/**
 * The content of the open dialog (`next`), or, once closed, the last content
 * shown, so the popup keeps it while it animates out.
 */
export function useShownContent(
  next: ShownInput | undefined,
): Content | undefined {
  const last = useRef<Content>(undefined);
  const summary = next
    ? getSummary(next.loan, next.figures, next.restored)
    : undefined;

  if (next && summary) {
    // Kept for the next render only: written during render, as in useBorrowFlow.
    last.current = { step: next.step, summary };
  }

  return last.current;
}

/**
 * Waiting for a deposit sent before a reload, or following a borrow the
 * user did not just confirm (`earlierPending`): nothing is asked of the
 * user, so it closes.
 */
export const waitOf = (content: Content | undefined) => {
  if (content?.step.kind !== 'pending') {
    return { earlierPending: false, closableWait: false };
  }

  const { earlier } = content.summary;

  return {
    earlierPending: earlier,
    closableWait: earlier || content.step.note === 'awaitingDeposit',
  };
};

type Closes = { closeButton: boolean; dismissible: boolean };

/**
 * How each dialog closes, besides a closable wait: confirm and an error
 * have a close button; pending and cancelling can't be dismissed.
 */
const CLOSES: Record<BorrowDialogStep['kind'], Closes> = {
  confirm: { closeButton: true, dismissible: true },
  pending: { closeButton: false, dismissible: false },
  cancelling: { closeButton: false, dismissible: false },
  done: { closeButton: false, dismissible: true },
  error: { closeButton: true, dismissible: true },
};

/** Before anything was shown. */
const NO_CONTENT_CLOSES: Closes = { closeButton: false, dismissible: true };

export const closesOf = (content: Content | undefined): Closes =>
  content ? CLOSES[content.step.kind] : NO_CONTENT_CLOSES;

/** A warning's window closes but the borrow is still tracked. */
export const isWarning = (step: BorrowDialogStep | undefined) =>
  step?.kind === 'error' && getErrorCopy(step.error).tone === 'warn';
