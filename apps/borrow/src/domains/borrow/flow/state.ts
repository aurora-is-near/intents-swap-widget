import type { ExecutionStatus } from '@aurora-is-near/intents-connect';

import type { BorrowErrorKind } from '../utils/classifyBorrowError';
import type { BorrowPreview } from '../utils/preview';
import type { BorrowPreviewFigures } from '../utils/previewFigures';
import type { BorrowStepsPreview } from '../utils/stepsRetry';
import type {
  BorrowCancelReason,
  BorrowFlowInput,
  BorrowPendingStep,
} from './types';

/** How a confirmed dry run is run: a bridge-in, or steps-only. */
export type DrivePlan =
  | { kind: 'run'; plan: BorrowPreview['preview']['plan'] }
  | { kind: 'runSteps'; plan: BorrowStepsPreview['steps']['plan'] };

/** What drives the runner: a plan, or a follow-up on the execution. */
export type DriveHow =
  | DrivePlan
  | { kind: 'resume'; executionId: string }
  | { kind: 'retryDeposit' };

/** What happens once a cancellation went through. */
export type CancelNext =
  /** The signature was declined: say so, nothing to retry but a new run. */
  | { kind: 'rejected'; cause: unknown }
  /** An earlier request blocked the confirmed borrow: run it now. */
  | { kind: 'run'; drive: DrivePlan }
  /** As `run`, after the user was asked again: quote afresh first. */
  | { kind: 'requote' };

/**
 * One borrow, from Borrow (or a restore) to done or left: what every state
 * past `idle` carries. `attempt` tags the async work started for it, so a
 * result that comes back after the user moved on is dropped.
 */
export type Run = {
  attempt: number;
  /** The form input; `undefined` for a borrow restored or found running. */
  input?: BorrowFlowInput;
  /** The accepted dry run: what runs, and what a failed borrow step is diagnosed from. */
  borrowed?: BorrowPreview | BorrowStepsPreview;
  /** The accepted dry run's figures, kept through signing, pending, done and errors. */
  figures?: BorrowPreviewFigures;
  /** The user confirmed these figures: a retry runs at once instead of going back to confirm. */
  confirmed: boolean;
  executionId?: string;
  /** The wallet connected when the execution was created, or found. */
  owner?: string;
  status?: ExecutionStatus;
  step: BorrowPendingStep;
  /** Signed, by this run's events. The runner's own flag is read too (`FlowEnv.runnerSigned`). */
  signed: boolean;
  /** The wallet broadcast the deposit: never sent again. */
  depositSent: boolean;
  /** Restored at `DEPOSIT_PENDING`: the deposit is waited for, never prompted. */
  waitingForDeposit: boolean;
  /** The "taking longer" timer is running. */
  delayArmed: boolean;
  /** The "taking longer" warning was closed: it is not shown again. */
  delayDismissed: boolean;
  /**
   * The collateral arrived and the borrow step failed: until the user
   * leaves, every retry runs steps-only from it, never a new bridge-in.
   */
  fundsWaiting?: { intermediary: string; executionId?: string };
  /** The wallet's connect modal is open; once back, resume this execution, or re-quote. */
  reconnect?: { resumeId?: string };
};

export type BorrowState =
  | { kind: 'idle'; attempt: number }
  /** Listing the wallet's open executions, before a quote or a run. */
  | {
      kind: 'checking';
      run: Run;
      then:
        | { kind: 'quote'; runAfter: boolean }
        | { kind: 'run'; drive: DrivePlan };
    }
  /** The pre-checks and the two dry runs (bridge-in), or the steps-only dry runs. */
  | { kind: 'quoting'; run: Run; runAfter: boolean }
  /** The accepted dry run and its figures, on the run. */
  | { kind: 'confirm'; run: Run & Required<Pick<Run, 'borrowed' | 'figures'>> }
  /** The wallet prompt to delete an open execution is up. */
  | {
      kind: 'cancelling';
      run: Run;
      executionId: string;
      /** The wallet that owns it, whose progress record goes once it is gone. */
      owner?: string;
      reason: BorrowCancelReason;
      next: CancelNext;
    }
  /** The runner creates the execution and asks for its signature. */
  | { kind: 'signing'; run: Run }
  /** Signed (or found on its way): the deposit, the bridge, the loan. */
  | { kind: 'tracking'; run: Run; warning: boolean }
  | { kind: 'done'; run: Run; executionId: string }
  | {
      kind: 'error';
      run: Run;
      error: BorrowErrorKind;
      cause: unknown;
      step: BorrowPendingStep;
      /** `cancelDeclined`: the cancellation `retry()` asks for again. */
      declinedCancel?: {
        executionId: string;
        reason: BorrowCancelReason;
        next: CancelNext;
      };
    };

export const initialState: BorrowState = { kind: 'idle', attempt: 0 };

export const attemptOf = (state: BorrowState): number =>
  state.kind === 'idle' ? state.attempt : state.run.attempt;

export const runOf = (state: BorrowState): Run | undefined =>
  state.kind === 'idle' ? undefined : state.run;

/** A run that has not started anything yet. */
export const freshRun = (attempt: number, input?: BorrowFlowInput): Run => ({
  attempt,
  input,
  confirmed: false,
  step: 0,
  signed: false,
  depositSent: false,
  waitingForDeposit: false,
  delayArmed: false,
  delayDismissed: false,
});

/**
 * The run's execution bookkeeping cleared for a new execution; the form
 * input, the accepted dry run, its figures, the confirmation and any
 * waiting collateral stay.
 */
export const resetRun = (run: Run, attempt = run.attempt): Run => ({
  ...run,
  attempt,
  executionId: undefined,
  owner: undefined,
  status: undefined,
  step: 0,
  signed: false,
  depositSent: false,
  waitingForDeposit: false,
  delayArmed: false,
  delayDismissed: false,
  reconnect: undefined,
});
