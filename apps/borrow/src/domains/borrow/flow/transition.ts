import { leave } from './transitions/restart';
import {
  onCancelFailed,
  onCancelled,
  onDelayElapsed,
  onDiagnosed,
  onOpenListed,
  onQuoted,
  onQuoteFailed,
  onRunDone,
  onRunFailed,
  onRunner,
} from './transitions/resultEvents';
import { onRetry } from './transitions/retry';
import {
  onClose,
  onConfirm,
  onReconnect,
  onReconnectFailed,
  onRefresh,
  onRestore,
  onStart,
  onWalletBack,
} from './transitions/userEvents';
import type { BorrowEvent, FlowEnv } from './events';
import type { BorrowState } from './state';
import type { Handler, Transition } from './transitions/shared';

/*
 * The borrow flow as a pure transition: `(state, event, env) → { state,
 * effects }`. Effects are data (`BorrowEffect`) the hook runs; their
 * results come back as events tagged with the run's `attempt`, and a result
 * for an attempt the user moved on from is dropped here.
 *
 * The handlers live in `transitions/`, by where the event comes from:
 * - `userEvents.ts` and `retry.ts`: what the user (or the page) asks for;
 * - `resultEvents.ts`: the results of the effects the hook ran;
 * - `runnerEvents.ts`: the runner's own events (`RUNNER`).
 * They share the moves in `progress.ts` (tracked, done, failed),
 * `restart.ts` (left, quoted afresh, after a cancellation) and `follow.ts`
 * (an execution this run did not start).
 */

/** One handler per event: each checks the event still applies to the state. */
const HANDLERS: { [T in BorrowEvent['type']]: Handler<T> } = {
  START: onStart,
  CONFIRM: onConfirm,
  RETRY: onRetry,
  REFRESH: onRefresh,
  CLOSE: onClose,
  LEAVE: leave,
  RECONNECT: onReconnect,
  RECONNECT_FAILED: onReconnectFailed,
  WALLET_BACK: onWalletBack,
  RESTORE: onRestore,
  OPEN_LISTED: onOpenListed,
  QUOTED: onQuoted,
  QUOTE_FAILED: onQuoteFailed,
  RUNNER: onRunner,
  RUN_DONE: onRunDone,
  RUN_FAILED: onRunFailed,
  CANCELLED: onCancelled,
  CANCEL_FAILED: onCancelFailed,
  DIAGNOSED: onDiagnosed,
  DELAY_ELAPSED: onDelayElapsed,
};

export const transition = (
  state: BorrowState,
  event: BorrowEvent,
  env: FlowEnv,
): Transition =>
  // `HANDLERS` has one handler per event type, picked by the event's own.
  (HANDLERS[event.type] as Handler<BorrowEvent['type']>)(state, event, env);
