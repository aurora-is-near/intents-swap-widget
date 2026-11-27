import { attemptOf } from '../state';
import type { BorrowEffect, BorrowEvent, FlowEnv } from '../events';
import type { BorrowState, Run } from '../state';

/** What every handler returns: the next state and the effects to run. */
export type Transition = { state: BorrowState; effects: BorrowEffect[] };

/** One event's handler: it checks the event still applies to the state. */
export type Handler<T extends BorrowEvent['type']> = (
  state: BorrowState,
  event: Extract<BorrowEvent, { type: T }>,
  env: FlowEnv,
) => Transition;

/** The runner drives (or follows) the run. */
export type Running = Extract<BorrowState, { kind: 'signing' | 'tracking' }>;

export type Cancelling = Extract<BorrowState, { kind: 'cancelling' }>;

export const stay = (state: BorrowState): Transition => ({
  state,
  effects: [],
});

export const CLEAR_DELAY: BorrowEffect = { type: 'clearDelay' };

/** `transition` with effects run `before` and `after` its own. */
export const withEffects = (
  transition: Transition,
  before: BorrowEffect[] = [],
  after: BorrowEffect[] = [],
): Transition => ({
  state: transition.state,
  effects: [...before, ...transition.effects, ...after],
});

export const drive = (
  run: Run,
  how: Extract<BorrowEffect, { type: 'drive' }>['how'],
): BorrowEffect => ({ type: 'drive', attempt: run.attempt, how });

/** The execution is over: its progress record and kept rows can go. */
export const settledEffects = (
  wallet: string | undefined,
  executionId: string | undefined,
): BorrowEffect[] =>
  executionId === undefined
    ? []
    : [
        { type: 'progress', op: 'forget', wallet, executionId },
        { type: 'notifySettled', executionId },
      ];

// ── Guards on results ───────────────────────────────────────────────────

/** `true` when a result event belongs to the state's current run. */
export const isCurrent = (state: BorrowState, attempt: number | undefined) =>
  attempt !== undefined && attempt === attemptOf(state);

/** The runner drives (or follows) the run the result belongs to. */
export const isCurrentRunning = (
  state: BorrowState,
  attempt: number | undefined,
): state is Running =>
  (state.kind === 'signing' || state.kind === 'tracking') &&
  isCurrent(state, attempt);

/** The result is for the cancellation the current run is waiting on. */
export const isCurrentCancel = (
  state: BorrowState,
  attempt: number,
  executionId: string,
): state is Cancelling =>
  state.kind === 'cancelling' &&
  isCurrent(state, attempt) &&
  state.executionId === executionId;
