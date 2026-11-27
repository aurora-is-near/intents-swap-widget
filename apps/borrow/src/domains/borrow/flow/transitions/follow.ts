import type { Execution } from '@aurora-is-near/intents-connect';

import { STATUS_STEP } from '../guards';
import { attemptOf, freshRun } from '../state';
import { maxStep, toPending } from './progress';
import { CLEAR_DELAY, withEffects } from './shared';
import type { ExecutionProgress } from '../../stores/executionProgress';
import type { FlowEnv } from '../events';
import type { BorrowState, Run } from '../state';
import type { RestorableExecution } from '../types';
import type { Transition } from './shared';

/**
 * Shows and tracks an execution on its way that this run did not start: one
 * restored after a reload, or the previous borrow still running when Borrow
 * was clicked. Signed by definition (`isOngoingExecution`); a deposit this
 * session saw leave the wallet is past step 0, else a `DEPOSIT_PENDING` one
 * waits for its deposit, never prompting the wallet.
 */
export const follow = (
  previousAttempt: number,
  found: RestorableExecution,
  known: ExecutionProgress | undefined,
  env: FlowEnv,
): Transition => {
  const attempt = previousAttempt + 1;
  const step = STATUS_STEP[found.status] ?? 0;
  const depositSent = known?.depositSent === true;
  const run: Run = {
    ...freshRun(attempt),
    confirmed: true,
    executionId: found.id,
    owner: env.wallet,
    status: found.status,
    signed: true,
    depositSent,
    waitingForDeposit: !depositSent && step === 0,
  };

  const pending = toPending(
    { kind: 'idle', attempt },
    run,
    depositSent ? maxStep(step, 1) : step,
  );

  return withEffects(
    pending,
    [CLEAR_DELAY],
    [{ type: 'follow', attempt, executionId: found.id }],
  );
};

/**
 * The previous borrow, still on its way, blocks a new one: it is shown and
 * tracked instead (`notifyPrevious` names it as the previous one); without
 * an `onPrevious`, the run stops at `busy`.
 */
export const showPrevious = (
  state: BorrowState & { run: Run },
  open: Execution,
  known: ExecutionProgress | undefined,
  env: FlowEnv,
): Transition => {
  if (!env.hasOnPrevious) {
    return {
      state: {
        kind: 'error',
        run: state.run,
        error: 'busy',
        cause: undefined,
        step: 0,
      },
      effects: [],
    };
  }

  const followed = follow(attemptOf(state), open, known, env);

  return withEffects(followed, [{ type: 'notifyPrevious', execution: open }]);
};
