import { ExecutionPollTimeoutError } from '@aurora-is-near/intents-connect';

import { resumeAfterReconnect } from '../guards';
import { attemptOf, freshRun, resetRun, runOf, updateRun } from '../state';
import { follow } from './follow';
import { toPending } from './progress';
import { drivePlanOf, leave, previewAnd, requote } from './restart';
import { CLEAR_DELAY, drive, stay, withEffects } from './shared';
import type { FlowEnv } from '../events';
import type { BorrowState, Run } from '../state';
import type { Handler, Transition } from './shared';

/*
 * What the user (or the page) asks for: Borrow, Confirm, Refresh, Close,
 * a reconnect, a restore. `RETRY` has its own module (`retry.ts`).
 */

/** A borrow is already on its way: the dialog is open on it. */
const isUnderway = (state: BorrowState) =>
  state.kind === 'signing' ||
  state.kind === 'cancelling' ||
  (state.kind === 'tracking' && !state.warning);

export const onStart: Handler<'START'> = (state, event) => {
  if (isUnderway(state)) {
    return stay(state);
  }

  const attempt = attemptOf(state) + 1;

  return {
    state: {
      kind: 'checking',
      run: freshRun(attempt, event.input),
      then: { kind: 'quote', runAfter: false },
    },
    effects: [CLEAR_DELAY, { type: 'listOpen', attempt }],
  };
};

export const onConfirm: Handler<'CONFIRM'> = (state) => {
  if (state.kind !== 'confirm') {
    return stay(state);
  }

  const attempt = attemptOf(state) + 1;

  return {
    state: {
      kind: 'checking',
      run: { ...resetRun(state.run, attempt), confirmed: true },
      then: { kind: 'run', drive: drivePlanOf(state.run.borrowed) },
    },
    effects: [CLEAR_DELAY, { type: 'listOpen', attempt }],
  };
};

export const onRefresh: Handler<'REFRESH'> = (state, _event, env) =>
  state.kind === 'idle' ? previewAnd(state, 'confirm') : requote(state, env);

export const onClose = (state: BorrowState): Transition => {
  const run = runOf(state);
  const tracked =
    state.kind === 'tracking' ||
    (state.kind === 'error' && state.error === 'delayed');

  if (!run || !tracked || run.executionId === undefined) {
    return leave(state);
  }

  const kept: Run = { ...run, delayDismissed: true, delayArmed: false };
  const tracking: BorrowState = { kind: 'tracking', run: kept, warning: false };

  if (
    state.kind === 'error' &&
    state.cause instanceof ExecutionPollTimeoutError
  ) {
    // Polling stopped: reattach to keep tracking it.
    return {
      state: tracking,
      effects: [
        CLEAR_DELAY,
        drive(kept, { kind: 'resume', executionId: run.executionId }),
      ],
    };
  }

  return { state: tracking, effects: [CLEAR_DELAY] };
};

export const onReconnect: Handler<'RECONNECT'> = (state, _event, env) => {
  if (state.kind === 'idle') {
    return stay(state);
  }

  return {
    state: updateRun(state, (run) => ({
      reconnect: { resumeId: resumeAfterReconnect(run, env) },
    })),
    effects: [{ type: 'connect' }],
  };
};

export const onReconnectFailed: Handler<'RECONNECT_FAILED'> = (state) =>
  state.kind === 'idle'
    ? stay(state)
    : stay(updateRun(state, () => ({ reconnect: undefined })));

const walletBack = (
  state: BorrowState & { run: Run },
  env: FlowEnv,
): Transition => {
  const resumeId = state.run.reconnect?.resumeId;
  const back = updateRun(state, () => ({ reconnect: undefined }));
  const { run } = back;

  if (resumeId === undefined) {
    // The old dry run was prepared for the runner of the wallet that left.
    return requote(back, env);
  }

  const resumed: Run = { ...run, executionId: resumeId, signed: true };

  return withEffects(
    toPending(back, resumed, run.step),
    [],
    [drive(resumed, { kind: 'resume', executionId: resumeId })],
  );
};

export const onWalletBack: Handler<'WALLET_BACK'> = (state, _event, env) =>
  state.kind !== 'idle' && state.run.reconnect
    ? walletBack(state, env)
    : stay(state);

export const onRestore: Handler<'RESTORE'> = (state, event, env) =>
  state.kind === 'idle'
    ? follow(state.attempt, event.execution, event.known, env)
    : stay(state);
