import type {
  ExecutionStatus,
  RunnerEvent,
} from '@aurora-is-near/intents-connect';

import { isTerminal, STATUS_STEP } from '../guards';
import { toDone, toPending } from './progress';
import { settledEffects, stay, withEffects } from './shared';
import type { BorrowEffect, FlowEnv } from '../events';
import type { Run } from '../state';
import type { BorrowPendingStep } from '../types';
import type { Running, Transition } from './shared';

/*
 * The runner's events (`RUNNER`), for the run it drives or follows.
 */

type RunnerHandler<T extends RunnerEvent['type']> = (
  state: Running,
  event: Extract<RunnerEvent, { type: T }>,
  env: FlowEnv,
) => Transition;

/** The runner says the execution is signed: tracked from `step` on. */
const signedAt = (state: Running, step: BorrowPendingStep): Transition =>
  toPending(state, { ...state.run, signed: true }, step);

/**
 * `awaiting-deposit` and `settling` come after the signature: signed. Any
 * other phase changes nothing. That includes `submitting`, which the runner
 * enters BEFORE `submitSignature`: a failed submit leaves the execution
 * CREATED, unsigned and holding the wallet's lock.
 */
const onPhase: RunnerHandler<'phase'> = (state, { phase }) => {
  if (phase === 'awaiting-deposit') {
    return signedAt(state, 0);
  }

  if (phase === 'settling') {
    return signedAt(state, 1);
  }

  return stay(state);
};

/** Where a non-SUCCESS status moves the run: a pending step, or nowhere. */
const moveOnStatus = (
  state: Running,
  next: Run,
  status: ExecutionStatus,
): Transition => {
  const step = STATUS_STEP[status];

  if (step !== undefined) {
    return toPending(state, next, step);
  }

  return stay({ ...state, run: next });
};

/** A terminal status settles the execution; SUCCESS is done (`toDone` settles). */
const onStatus: RunnerHandler<'status'> = (state, { status }) => {
  const { run } = state;

  if (status === 'SUCCESS') {
    return toDone(state, { ...run, status }, run.executionId);
  }

  return withEffects(
    moveOnStatus(state, { ...run, status }, status),
    isTerminal(status) ? settledEffects(run.owner, run.executionId) : [],
  );
};

const onCreated: RunnerHandler<'created'> = (state, { executionId }, env) => ({
  state: {
    ...state,
    run: { ...state.run, executionId, owner: env.wallet },
  },
  effects: [
    { type: 'progress', op: 'created', wallet: env.wallet, executionId },
    { type: 'notifyCreated', executionId },
  ],
});

const onDepositSent: RunnerHandler<'deposit-sent'> = (state) => {
  const sent: Run = { ...state.run, signed: true, depositSent: true };
  const recorded: BorrowEffect[] =
    sent.executionId === undefined
      ? []
      : [
          {
            type: 'progress',
            op: 'depositSent',
            wallet: sent.owner,
            executionId: sent.executionId,
          },
        ];

  return withEffects(toPending(state, sent, 1), recorded);
};

/**
 * The runner events the flow acts on. `error`: the rejected promise
 * (`RUN_FAILED`) reports it. `quoted`: exact fee figures of the three-round
 * strategy; the dialog shows the dry run's.
 */
const RUNNER_HANDLERS: { [T in RunnerEvent['type']]?: RunnerHandler<T> } = {
  phase: onPhase,
  status: onStatus,
  created: onCreated,
  'deposit-address': (state) => signedAt(state, 0),
  'deposit-sent': onDepositSent,
};

export const onRunnerEvent = (
  state: Running,
  event: RunnerEvent,
  env: FlowEnv,
): Transition => {
  const handle = RUNNER_HANDLERS[event.type] as
    | RunnerHandler<RunnerEvent['type']>
    | undefined;

  return handle ? handle(state, event, env) : stay(state);
};
