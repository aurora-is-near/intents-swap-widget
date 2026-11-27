import {
  DepositTransferError,
  deriveExecutionRecovery,
} from '@aurora-is-near/intents-connect';

import { isFundsWaiting, isSigned, isTerminal } from '../guards';
import { toPending } from './progress';
import { previewAnd, retryWaiting } from './restart';
import { drive, stay, withEffects } from './shared';
import type { FlowEnv } from '../events';
import type { BorrowState } from '../state';
import type { Handler, Transition } from './shared';

/*
 * `RETRY` from an error: the one way back that fits what was signed, sent
 * or declined.
 */

type Failed = Extract<BorrowState, { kind: 'error' }>;

/** `cancelDeclined`: the cancellation the user declined is asked for again. */
const cancelAgain = (
  state: Failed,
  declined: NonNullable<Failed['declinedCancel']>,
  env: FlowEnv,
): Transition => ({
  state: {
    kind: 'cancelling',
    run: state.run,
    executionId: declined.executionId,
    owner: env.wallet,
    reason: declined.reason,
    next: declined.next,
  },
  effects: [
    {
      type: 'cancel',
      attempt: state.run.attempt,
      executionId: declined.executionId,
    },
  ],
});

/** Only the deposit transfer failed: the execution itself is signed. */
const failedTransfer = (cause: unknown) =>
  cause instanceof DepositTransferError ||
  deriveExecutionRecovery(cause)?.kind === 'retry-transfer';

/** Signed: only the deposit transfer is prompted again. */
const retryDeposit = (state: Failed): Transition => {
  const { run } = state;

  return withEffects(
    toPending(state, run, run.step),
    [],
    [drive(run, { kind: 'retryDeposit' })],
  );
};

/** Signed and still live (a poll timeout, say): keep watching it. */
const keepWatching = (state: Failed, env: FlowEnv): Transition => {
  const { run } = state;
  const executionId = run.executionId ?? env.runnerExecutionId;

  if (executionId === undefined) {
    return stay(state);
  }

  return withEffects(
    toPending(state, { ...run, executionId }, run.step),
    [],
    [drive(run, { kind: 'resume', executionId })],
  );
};

const retryFailed = (state: Failed, env: FlowEnv): Transition => {
  const { run, declinedCancel } = state;

  if (state.error === 'cancelDeclined' && declinedCancel) {
    return cancelAgain(state, declinedCancel, env);
  }

  if (isFundsWaiting(run, env)) {
    // A new bridge-in would spend the user's funds a second time.
    return retryWaiting(state, env);
  }

  if (failedTransfer(state.cause)) {
    return retryDeposit(state);
  }

  if (!isSigned(run, env)) {
    // Nothing signed: the old quote is stale. Run at once only when the
    // user already confirmed this borrow.
    return previewAnd(state, run.confirmed ? 'run' : 'confirm');
  }

  if (isTerminal(run.status)) {
    // Over (DEPOSIT_FAILED: refunded) and no longer holding the lock.
    return previewAnd(state, 'confirm');
  }

  return keepWatching(state, env);
};

export const onRetry: Handler<'RETRY'> = (state, _event, env) =>
  state.kind === 'error' ? retryFailed(state, env) : stay(state);
