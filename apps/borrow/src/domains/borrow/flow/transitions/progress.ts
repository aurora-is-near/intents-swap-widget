import { deriveExecutionRecovery } from '@aurora-is-near/intents-connect';

import { classifyBorrowError } from '../../utils/classifyBorrowError';
import { isDeclinedSignature } from '../guards';
import { updateRun } from '../state';
import { CLEAR_DELAY, settledEffects, stay } from './shared';
import type { BorrowEffect, FlowEnv } from '../events';
import type { BorrowState, Run } from '../state';
import type { BorrowPendingStep } from '../types';
import type { Transition } from './shared';

/*
 * Where a run moves as its execution does: tracked at a step, done, or
 * failed.
 */

export const maxStep = (a: BorrowPendingStep, b: BorrowPendingStep) =>
  Math.max(a, b) as BorrowPendingStep;

/**
 * Tracking at `step` (never moving back). A restored borrow waiting for its
 * deposit stops waiting once it arrives (step 1 on). Under the "taking
 * longer" warning the run is updated underneath and the warning stays; the
 * timer is armed once, unless the warning was closed.
 */
export const toPending = (
  state: BorrowState,
  run: Run,
  step: BorrowPendingStep,
): Transition => {
  let next: Run = {
    ...run,
    waitingForDeposit: step > 0 ? false : run.waitingForDeposit,
    step: maxStep(run.step, step),
  };

  if (state.kind === 'done') {
    return stay(state);
  }

  if (state.kind === 'tracking' && state.warning) {
    return stay({ ...state, run: next });
  }

  const effects: BorrowEffect[] = [];

  if (!next.delayArmed && !next.delayDismissed) {
    next = { ...next, delayArmed: true };
    effects.push({ type: 'armDelay', attempt: next.attempt });
  }

  return { state: { kind: 'tracking', run: next, warning: false }, effects };
};

export const toDone = (
  state: BorrowState & { run: Run },
  run: Run,
  id: string | undefined,
): Transition => {
  // An empty id from the runner means it did not say: the run's own stands.
  const executionId = id === undefined || id === '' ? run.executionId : id;
  const stopped: Run = { ...run, delayArmed: false };

  if (executionId === undefined) {
    return {
      state: updateRun(state, () => stopped),
      effects: [CLEAR_DELAY],
    };
  }

  return {
    state: { kind: 'done', run: stopped, executionId },
    effects: [CLEAR_DELAY, ...settledEffects(run.owner, executionId)],
  };
};

/**
 * A failure classified into an error state. A declined signature instead
 * cancels the execution it created (`cancelling`, `declined`). A failed
 * borrow step is shown at once and refined once the market is read
 * (`diagnose`).
 */
export const fail = (run: Run, error: unknown, env: FlowEnv): Transition => {
  const stopped: Run = { ...run, delayArmed: false };

  if (isDeclinedSignature(error, stopped, env) && stopped.executionId) {
    return {
      state: {
        kind: 'cancelling',
        run: stopped,
        executionId: stopped.executionId,
        owner: env.wallet,
        reason: 'declined',
        next: { kind: 'rejected', cause: error },
      },
      effects: [
        CLEAR_DELAY,
        {
          type: 'cancel',
          attempt: stopped.attempt,
          executionId: stopped.executionId,
        },
      ],
    };
  }

  const effects: BorrowEffect[] = [CLEAR_DELAY];

  if (
    stopped.status === 'OPERATION_FAILED' &&
    stopped.input &&
    stopped.borrowed
  ) {
    effects.push({
      type: 'diagnose',
      attempt: stopped.attempt,
      cause: error,
      input: stopped.input,
      borrowed: stopped.borrowed,
    });
  }

  return {
    state: {
      kind: 'error',
      run: stopped,
      error: classifyBorrowError(error, deriveExecutionRecovery(error), {
        status: stopped.status,
      }),
      cause: error,
      step: stopped.step,
    },
    effects,
  };
};
