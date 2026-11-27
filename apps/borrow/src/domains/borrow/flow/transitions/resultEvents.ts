import {
  deriveExecutionRecovery,
  ExecutionCancelledError,
  isUserRejection,
} from '@aurora-is-near/intents-connect';
import type { Execution } from '@aurora-is-near/intents-connect';

import { isOngoingExecution } from '../../stores/executionProgress';
import { classifyBorrowError } from '../../utils/classifyBorrowError';
import { isStepsPreview } from '../guards';
import { showPrevious } from './follow';
import { fail, toDone } from './progress';
import { afterCancel, drivePlanOf } from './restart';
import { onRunnerEvent } from './runnerEvents';
import {
  CLEAR_DELAY,
  drive,
  isCurrent,
  isCurrentCancel,
  isCurrentRunning,
  stay,
} from './shared';
import type { FlowEnv } from '../events';
import type { BorrowState, CancelNext, DrivePlan, Run } from '../state';
import type { Handler, Transition } from './shared';

/*
 * The results of the effects the hook ran, each tagged with the attempt
 * that asked for it: one for an attempt the user moved on from is dropped.
 */

type Checking = Extract<BorrowState, { kind: 'checking' }>;

/** No borrow on its way: the form input is quoted (bridge-in). */
const quoteChecked = (state: Checking, runAfter: boolean): Transition => {
  const { run } = state;

  return {
    state: { kind: 'quoting', run, runAfter },
    effects: run.input
      ? [{ type: 'quote', attempt: run.attempt, input: run.input }]
      : [],
  };
};

/**
 * The confirmed borrow runs. An open execution in its way (never signed, or
 * signed and never funded) is cancelled first.
 */
const runChecked = (
  state: Checking,
  plan: DrivePlan,
  open: Execution | undefined,
  env: FlowEnv,
): Transition => {
  const { run } = state;

  if (open === undefined) {
    return {
      state: { kind: 'signing', run },
      effects: [drive(run, plan)],
    };
  }

  return {
    state: {
      kind: 'cancelling',
      run,
      executionId: open.id,
      owner: env.wallet,
      reason: 'previous',
      next: { kind: 'run', drive: plan },
    },
    effects: [{ type: 'cancel', attempt: run.attempt, executionId: open.id }],
  };
};

export const onOpenListed: Handler<'OPEN_LISTED'> = (state, event, env) => {
  if (state.kind !== 'checking' || !isCurrent(state, event.attempt)) {
    return stay(state);
  }

  const { open, known } = event;

  if (open !== undefined && isOngoingExecution(open, known)) {
    return showPrevious(state, open, known, env);
  }

  if (state.then.kind === 'quote') {
    return quoteChecked(state, state.then.runAfter);
  }

  return runChecked(state, state.then.drive, open, env);
};

export const onQuoted: Handler<'QUOTED'> = (state, event) => {
  if (state.kind !== 'quoting' || !isCurrent(state, event.attempt)) {
    return stay(state);
  }

  const run = {
    ...state.run,
    borrowed: event.preview,
    figures: event.figures,
  };

  if (state.runAfter && !isStepsPreview(event.preview)) {
    return {
      state: {
        kind: 'checking',
        run,
        then: { kind: 'run', drive: drivePlanOf(event.preview) },
      },
      effects: [{ type: 'listOpen', attempt: event.attempt }],
    };
  }

  return {
    state: {
      kind: 'confirm',
      run: { ...run, confirmed: false },
    },
    effects: [],
  };
};

export const onQuoteFailed: Handler<'QUOTE_FAILED'> = (state, event, env) =>
  state.kind === 'quoting' && isCurrent(state, event.attempt)
    ? fail(state.run, event.error, env)
    : stay(state);

export const onRunner: Handler<'RUNNER'> = (state, event, env) =>
  isCurrentRunning(state, event.attempt)
    ? onRunnerEvent(state, event.event, env)
    : stay(state);

export const onRunDone: Handler<'RUN_DONE'> = (state, event) =>
  isCurrentRunning(state, event.attempt)
    ? toDone(state, state.run, event.id)
    : stay(state);

/** Cancelled elsewhere: nothing went wrong, the borrow is just over. */
const cancelledElsewhere = ({ attempt, executionId }: Run): Transition => ({
  state: { kind: 'idle', attempt },
  effects:
    executionId === undefined
      ? [CLEAR_DELAY]
      : [CLEAR_DELAY, { type: 'notifySettled', executionId }],
});

export const onRunFailed: Handler<'RUN_FAILED'> = (state, event, env) => {
  if (!isCurrentRunning(state, event.attempt)) {
    return stay(state);
  }

  if (event.error instanceof ExecutionCancelledError) {
    return cancelledElsewhere(state.run);
  }

  return fail(state.run, event.error, env);
};

export const onCancelled: Handler<'CANCELLED'> = (state, event) =>
  isCurrentCancel(state, event.attempt, event.executionId)
    ? afterCancel(state)
    : stay(state);

export const onCancelFailed: Handler<'CANCEL_FAILED'> = (state, event) => {
  if (!isCurrentCancel(state, event.attempt, event.executionId)) {
    return stay(state);
  }

  // Any other failure (already gone, expired) counts as released: a run
  // it still blocks is then refused as `busy`.
  if (!isUserRejection(event.error)) {
    return afterCancel(state);
  }

  const next: CancelNext =
    state.reason === 'previous' ? { kind: 'requote' } : state.next;

  return {
    state: {
      kind: 'error',
      run: state.run,
      error: 'cancelDeclined',
      cause: event.error,
      step: 0,
      declinedCancel: {
        executionId: state.executionId,
        reason: state.reason,
        next,
      },
    },
    effects: [],
  };
};

export const onDiagnosed: Handler<'DIAGNOSED'> = (state, event) => {
  if (
    state.kind !== 'error' ||
    !isCurrent(state, event.attempt) ||
    state.cause !== event.cause
  ) {
    return stay(state);
  }

  return stay({
    ...state,
    error: classifyBorrowError(
      event.cause,
      deriveExecutionRecovery(event.cause),
      { status: state.run.status, borrowStep: event.borrowStep },
    ),
  });
};

export const onDelayElapsed: Handler<'DELAY_ELAPSED'> = (state, event) =>
  state.kind === 'tracking' && !state.warning && isCurrent(state, event.attempt)
    ? stay({ ...state, warning: true })
    : stay(state);
