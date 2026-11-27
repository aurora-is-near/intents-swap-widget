import { intermediaryOf, isFundsWaiting, isStepsPreview } from '../guards';
import { attemptOf, resetRun, runOf } from '../state';
import {
  CLEAR_DELAY,
  drive,
  settledEffects,
  stay,
  withEffects,
} from './shared';
import type { FlowEnv } from '../events';
import type { BorrowState, DrivePlan, Run } from '../state';
import type { Cancelling, Transition } from './shared';

/*
 * Moving on from the current attempt: leaving it, quoting it afresh, or
 * going on once a cancellation went through.
 */

export const leave = (state: BorrowState): Transition => ({
  state: { kind: 'idle', attempt: attemptOf(state) + 1 },
  effects: [CLEAR_DELAY],
});

/**
 * Quotes the run's input afresh, after checking the wallet's lock: an
 * earlier borrow on its way is shown instead. `run` runs it at once once
 * quoted. Without an input (a borrow restored or found running), the run is
 * left and the form starts a new one.
 */
export const previewAnd = (
  state: BorrowState,
  then: 'confirm' | 'run',
): Transition => {
  const run = runOf(state);

  if (!run?.input) {
    return leave(state);
  }

  const attempt = attemptOf(state) + 1;

  return {
    state: {
      kind: 'checking',
      run: resetRun(run, attempt),
      then: { kind: 'quote', runAfter: then === 'run' },
    },
    effects: [CLEAR_DELAY, { type: 'listOpen', attempt }],
  };
};

/**
 * The steps-only retry over the waiting collateral: re-sized on the market
 * read afresh, back to `confirm`. Without the form input or the
 * intermediary there is nothing to size it from.
 */
export const retryWaiting = (
  state: BorrowState & { run: Run },
  env: FlowEnv,
): Transition => {
  const { run } = state;
  const intermediary = intermediaryOf(run, env);

  if (!run.input || intermediary === undefined) {
    return stay(state);
  }

  const attempt = attemptOf(state) + 1;

  return {
    state: {
      kind: 'quoting',
      run: {
        ...resetRun(run, attempt),
        fundsWaiting: {
          intermediary,
          executionId: run.fundsWaiting?.executionId ?? run.executionId,
        },
      },
      runAfter: false,
    },
    effects: [
      CLEAR_DELAY,
      { type: 'quoteSteps', attempt, input: run.input, intermediary },
    ],
  };
};

/**
 * A fresh quote for the run: the steps-only retry when the collateral is
 * waiting, else a new dry run back to `confirm`.
 */
export const requote = (state: BorrowState & { run: Run }, env: FlowEnv) =>
  isFundsWaiting(state.run, env)
    ? retryWaiting(state, env)
    : previewAnd(state, 'confirm');

/** What a confirmed dry run runs as. */
export const drivePlanOf = (preview: Run['borrowed'] & object): DrivePlan =>
  isStepsPreview(preview)
    ? { kind: 'runSteps', plan: preview.steps.plan }
    : { kind: 'run', plan: preview.preview.plan };

/** A cancellation went through: forget the execution, then go on with `next`. */
export const afterCancel = (state: Cancelling): Transition => {
  const { executionId, next } = state;
  const run: Run =
    state.run.executionId === executionId
      ? { ...state.run, executionId: undefined }
      : state.run;

  const effects = settledEffects(state.owner, executionId);

  if (next.kind === 'rejected') {
    return {
      state: {
        kind: 'error',
        run,
        error: 'rejected',
        cause: next.cause,
        step: 0,
      },
      effects,
    };
  }

  if (next.kind === 'run') {
    return {
      state: { kind: 'signing', run },
      effects: [...effects, drive(run, next.drive)],
    };
  }

  // Asked again: the cancellation may have outlived the quote.
  return withEffects(
    previewAnd({ ...state, run }, run.confirmed ? 'run' : 'confirm'),
    effects,
  );
};
