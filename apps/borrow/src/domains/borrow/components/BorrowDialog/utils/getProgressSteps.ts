import type { Step } from '@aurora-is-near/ui-kit';

import { assertNever } from '@/utils/assertNever';

import { getErrorCopy } from './getErrorCopy';
import type { BorrowDialogStep, ProgressStep } from './getBorrowDialogStep';

/**
 * The three steps (`n: 3`, line 1453), worded in the order the borrow runs
 * them, which is `useBorrowFlow`'s pending steps: 0 signing and the deposit,
 * 1 the collateral bridging to the market's chain, 2 Aave's supply and
 * borrow and the delivery. The artboard's labels put "Supply collateral and
 * open the loan" before "Bridge and deliver", the other way round, so they
 * are reworded here (review finding F22, option a). The last names the
 * borrowed token, or the funds when it is not known (a borrow restored
 * without its record).
 */
const stepLabels = (borrowSymbol: string | undefined) => [
  'Sign and deposit',
  'Bridge the collateral',
  `Open the loan and deliver ${borrowSymbol ?? 'the funds'}`,
];

type StepStatus = Step['status'];

/** Before the step reached done, the reached one `atStatus`, the rest waiting. */
const statusAround = (
  index: number,
  at: number,
  atStatus: StepStatus,
): StepStatus => {
  if (index < at) {
    return 'done';
  }

  return index === at ? atStatus : 'waiting';
};

/**
 * An error's step fails where the borrow stopped (the kind's own step when
 * not known); a warning keeps it running (`ac`, line 1519).
 */
const errorStepStatus = (
  dialog: Extract<BorrowDialogStep, { kind: 'error' }>,
  index: number,
): StepStatus => {
  const copy = getErrorCopy(dialog.error);

  return statusAround(
    index,
    dialog.step ?? copy.step,
    copy.tone === 'warn' ? 'active' : 'failed',
  );
};

/**
 * Each step's status (line 1519): before the current one done, the current
 * one active, the rest waiting; all waiting while confirming.
 */
const stepStatus = (dialog: ProgressStep, index: number): StepStatus => {
  switch (dialog.kind) {
    case 'confirm':
      return 'waiting';
    case 'cancelling':
      // A declined signature failed the first step; an earlier request's
      // cancellation comes before this borrow's steps.
      return index === 0 && dialog.reason === 'declined' ? 'failed' : 'waiting';
    case 'error':
      return errorStepStatus(dialog, index);
    case 'pending':
      return statusAround(index, dialog.step, 'active');
    default:
      return assertNever(dialog, 'dialog step');
  }
};

export const getProgressSteps = (
  borrowSymbol: string | undefined,
  dialog: ProgressStep,
): Step[] =>
  stepLabels(borrowSymbol).map((label, index) => ({
    label,
    status: stepStatus(dialog, index),
  }));
