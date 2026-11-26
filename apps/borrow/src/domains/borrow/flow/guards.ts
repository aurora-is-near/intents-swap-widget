import {
  DepositTransferError,
  isUserRejection,
  TERMINAL_STATUSES,
} from '@aurora-is-near/intents-connect';
import type { ExecutionStatus } from '@aurora-is-near/intents-connect';

import { AWAITING_FUNDS } from '../stores/executionProgress';
import type { BorrowPreview } from '../utils/preview';
import type { BorrowStepsPreview } from '../utils/stepsRetry';
import type { FlowEnv } from './events';
import type { Run } from './state';
import type { BorrowPendingStep } from './types';

/** The pending step each in-flight status is drawn on. */
export const STATUS_STEP: Partial<Record<ExecutionStatus, BorrowPendingStep>> =
  {
    DEPOSIT_PENDING: 0,
    DEPOSIT_PROCESSING: 1,
    OPERATION_PENDING: 2,
    OPERATION_PROCESSING: 2,
  };

/** A steps-only retry's dry run, not a bridge-in's. */
export const isStepsPreview = (
  preview: BorrowPreview | BorrowStepsPreview,
): preview is BorrowStepsPreview => 'steps' in preview;

export const isTerminal = (status: ExecutionStatus | undefined) =>
  status !== undefined && TERMINAL_STATUSES.includes(status);

/**
 * The run's execution was signed: by its events, which survive a wallet
 * switch, or by the runner that ran it.
 */
export const isSigned = (run: Run, env: FlowEnv) =>
  run.signed || env.runnerSigned;

/**
 * The user declined the signature of an execution this run created: it
 * holds the wallet's lock, so it is cancelled at once. A declined deposit
 * transaction is not one: the execution is signed.
 */
export const isDeclinedSignature = (error: unknown, run: Run, env: FlowEnv) =>
  run.executionId !== undefined &&
  !isSigned(run, env) &&
  isUserRejection(error) &&
  !(error instanceof DepositTransferError);

/**
 * The collateral arrived and the borrow step failed: a new bridge-in would
 * spend the user's funds a second time.
 */
export const isFundsWaiting = (run: Run, env: FlowEnv) =>
  run.fundsWaiting !== undefined ||
  (isSigned(run, env) && run.status === 'OPERATION_FAILED');

/**
 * Where the waiting collateral sits: the run's record of it, the runner's
 * execution, else the accepted dry run's intermediary.
 */
export const intermediaryOf = (run: Run, env: FlowEnv): string | undefined => {
  const known = run.fundsWaiting?.intermediary ?? env.runnerIntermediary;
  const { borrowed } = run;

  if (known !== undefined || borrowed === undefined) {
    return known;
  }

  return isStepsPreview(borrowed)
    ? borrowed.steps.plan.prepared?.intermediary
    : borrowed.preview.plan.prepared?.intermediary;
};

/**
 * Reconnecting after the wallet left: a signed execution whose deposit left
 * the wallet (or was seen) is resumed; one never funded is abandoned, and
 * the next borrow cancels it.
 */
export const resumeAfterReconnect = (
  run: Run,
  env: FlowEnv,
): string | undefined =>
  isSigned(run, env) &&
  (run.depositSent ||
    (run.status !== undefined && !AWAITING_FUNDS.has(run.status)))
    ? run.executionId
    : undefined;
