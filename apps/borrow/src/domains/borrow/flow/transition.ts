import {
  DepositTransferError,
  deriveExecutionRecovery,
  ExecutionCancelledError,
  ExecutionPollTimeoutError,
  isUserRejection,
} from '@aurora-is-near/intents-connect';
import type {
  Execution,
  ExecutionStatus,
  RunnerEvent,
} from '@aurora-is-near/intents-connect';

import { isOngoingExecution } from '../stores/executionProgress';
import { classifyBorrowError } from '../utils/classifyBorrowError';
import {
  intermediaryOf,
  isDeclinedSignature,
  isFundsWaiting,
  isSigned,
  isStepsPreview,
  isTerminal,
  resumeAfterReconnect,
  STATUS_STEP,
} from './guards';
import { attemptOf, freshRun, resetRun, runOf } from './state';
import type { ExecutionProgress } from '../stores/executionProgress';
import type { BorrowEffect, BorrowEvent, FlowEnv } from './events';
import type { BorrowState, CancelNext, DrivePlan, Run } from './state';
import type { BorrowPendingStep, RestorableExecution } from './types';

/*
 * The borrow flow as a pure transition: `(state, event, env) → { state,
 * effects }`. Effects are data (`BorrowEffect`) the hook runs; their
 * results come back as events tagged with the run's `attempt`, and a result
 * for an attempt the user moved on from is dropped here.
 */

type Transition = { state: BorrowState; effects: BorrowEffect[] };

const stay = (state: BorrowState): Transition => ({ state, effects: [] });

const CLEAR_DELAY: BorrowEffect = { type: 'clearDelay' };

const maxStep = (a: BorrowPendingStep, b: BorrowPendingStep) =>
  Math.max(a, b) as BorrowPendingStep;

// ── Building blocks ─────────────────────────────────────────────────────

/**
 * Tracking at `step` (never moving back). A restored borrow waiting for its
 * deposit stops waiting once it arrives (step 1 on). Under the "taking
 * longer" warning the run is updated underneath and the warning stays; the
 * timer is armed once, unless the warning was closed.
 */
const toPending = (
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

/** The execution is over: its progress record and kept rows can go. */
const settledEffects = (
  wallet: string | undefined,
  executionId: string | undefined,
): BorrowEffect[] =>
  executionId === undefined
    ? []
    : [
        { type: 'progress', op: 'forget', wallet, executionId },
        { type: 'notifySettled', executionId },
      ];

const toDone = (state: BorrowState, run: Run, id: string | undefined) => {
  // An empty id from the runner means it did not say: the run's own stands.
  const executionId = id === undefined || id === '' ? run.executionId : id;
  const stopped: Run = { ...run, delayArmed: false };

  if (executionId === undefined) {
    return {
      state: { ...state, run: stopped } as BorrowState,
      effects: [CLEAR_DELAY],
    };
  }

  return {
    state: { kind: 'done', run: stopped, executionId } as BorrowState,
    effects: [CLEAR_DELAY, ...settledEffects(run.owner, executionId)],
  };
};

/**
 * A failure classified into an error state. A declined signature instead
 * cancels the execution it created (`cancelling`, `declined`). A failed
 * borrow step is shown at once and refined once the market is read
 * (`diagnose`).
 */
const fail = (run: Run, error: unknown, env: FlowEnv): Transition => {
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

/**
 * Shows and tracks an execution on its way that this run did not start: one
 * restored after a reload, or the previous borrow still running when Borrow
 * was clicked. Signed by definition (`isOngoingExecution`); a deposit this
 * session saw leave the wallet is past step 0, else a `DEPOSIT_PENDING` one
 * waits for its deposit, never prompting the wallet.
 */
const follow = (
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

  return {
    state: pending.state,
    effects: [
      CLEAR_DELAY,
      ...pending.effects,
      { type: 'follow', attempt, executionId: found.id },
    ],
  };
};

/**
 * The previous borrow, still on its way, blocks a new one: it is shown and
 * tracked instead (`notifyPrevious` names it as the previous one); without
 * an `onPrevious`, the run stops at `busy`.
 */
const showPrevious = (
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

  return {
    state: followed.state,
    effects: [{ type: 'notifyPrevious', execution: open }, ...followed.effects],
  };
};

const leave = (state: BorrowState): Transition => ({
  state: { kind: 'idle', attempt: attemptOf(state) + 1 },
  effects: [CLEAR_DELAY],
});

/**
 * Quotes the run's input afresh, after checking the wallet's lock: an
 * earlier borrow on its way is shown instead. `run` runs it at once once
 * quoted. Without an input (a borrow restored or found running), the run is
 * left and the form starts a new one.
 */
const previewAnd = (
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
const retryWaiting = (
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

const drive = (
  run: Run,
  how: Extract<BorrowEffect, { type: 'drive' }>['how'],
): BorrowEffect => ({ type: 'drive', attempt: run.attempt, how });

/** What a confirmed dry run runs as. */
const drivePlanOf = (preview: Run['borrowed'] & object): DrivePlan =>
  isStepsPreview(preview)
    ? { kind: 'runSteps', plan: preview.steps.plan }
    : { kind: 'run', plan: preview.preview.plan };

/** A cancellation went through: forget the execution, then go on with `next`. */
const afterCancel = (
  state: Extract<BorrowState, { kind: 'cancelling' }>,
): Transition => {
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
  const requoted = previewAnd(
    { ...state, run },
    run.confirmed ? 'run' : 'confirm',
  );

  return {
    state: requoted.state,
    effects: [...effects, ...requoted.effects],
  };
};

// ── Runner events ───────────────────────────────────────────────────────

type Running = Extract<BorrowState, { kind: 'signing' | 'tracking' }>;

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

  const effects = isTerminal(status)
    ? settledEffects(run.owner, run.executionId)
    : [];

  const moved = moveOnStatus(state, { ...run, status }, status);

  return { state: moved.state, effects: [...effects, ...moved.effects] };
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
  const pending = toPending(state, sent, 1);
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

  return {
    state: pending.state,
    effects: [...recorded, ...pending.effects],
  };
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

const onRunnerEvent = (
  state: Running,
  event: RunnerEvent,
  env: FlowEnv,
): Transition => {
  const handle = RUNNER_HANDLERS[event.type] as
    | RunnerHandler<RunnerEvent['type']>
    | undefined;

  return handle ? handle(state, event, env) : stay(state);
};

// ── User events ─────────────────────────────────────────────────────────

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
  const pending = toPending(state, run, run.step);

  return {
    state: pending.state,
    effects: [...pending.effects, drive(run, { kind: 'retryDeposit' })],
  };
};

/** Signed and still live (a poll timeout, say): keep watching it. */
const keepWatching = (state: Failed, env: FlowEnv): Transition => {
  const { run } = state;
  const executionId = run.executionId ?? env.runnerExecutionId;

  if (executionId === undefined) {
    return stay(state);
  }

  const pending = toPending(state, { ...run, executionId }, run.step);

  return {
    state: pending.state,
    effects: [...pending.effects, drive(run, { kind: 'resume', executionId })],
  };
};

const onRetry = (state: Failed, env: FlowEnv): Transition => {
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

const onClose = (state: BorrowState): Transition => {
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

/**
 * A fresh quote for the run: the steps-only retry when the collateral is
 * waiting, else a new dry run back to `confirm`.
 */
const requote = (state: BorrowState & { run: Run }, env: FlowEnv) =>
  isFundsWaiting(state.run, env)
    ? retryWaiting(state, env)
    : previewAnd(state, 'confirm');

const onWalletBack = (
  state: BorrowState & { run: Run },
  env: FlowEnv,
): Transition => {
  const resumeId = state.run.reconnect?.resumeId;
  const run: Run = { ...state.run, reconnect: undefined };
  const back = { ...state, run } as BorrowState & { run: Run };

  if (resumeId === undefined) {
    // The old dry run was prepared for the runner of the wallet that left.
    return requote(back, env);
  }

  const resumed: Run = { ...run, executionId: resumeId, signed: true };
  const pending = toPending(back, resumed, run.step);

  return {
    state: pending.state,
    effects: [
      ...pending.effects,
      drive(resumed, { kind: 'resume', executionId: resumeId }),
    ],
  };
};

// ── Guards on results ───────────────────────────────────────────────────

type Checking = Extract<BorrowState, { kind: 'checking' }>;
type Cancelling = Extract<BorrowState, { kind: 'cancelling' }>;

/** `true` when a result event belongs to the state's current run. */
const isCurrent = (state: BorrowState, attempt: number | undefined) =>
  attempt !== undefined && attempt === attemptOf(state);

/** A borrow is already on its way: the dialog is open on it. */
const isUnderway = (state: BorrowState) =>
  state.kind === 'signing' ||
  state.kind === 'cancelling' ||
  (state.kind === 'tracking' && !state.warning);

/** The runner drives (or follows) the run the result belongs to. */
const isCurrentRunning = (
  state: BorrowState,
  attempt: number | undefined,
): state is Running =>
  (state.kind === 'signing' || state.kind === 'tracking') &&
  isCurrent(state, attempt);

/** The result is for the cancellation the current run is waiting on. */
const isCurrentCancel = (
  state: BorrowState,
  attempt: number,
  executionId: string,
): state is Cancelling =>
  state.kind === 'cancelling' &&
  isCurrent(state, attempt) &&
  state.executionId === executionId;

// ── Event handlers ──────────────────────────────────────────────────────

type Handler<T extends BorrowEvent['type']> = (
  state: BorrowState,
  event: Extract<BorrowEvent, { type: T }>,
  env: FlowEnv,
) => Transition;

const onStart: Handler<'START'> = (state, event) => {
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

const onConfirm: Handler<'CONFIRM'> = (state) => {
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

const onRefresh: Handler<'REFRESH'> = (state, _event, env) =>
  state.kind === 'idle' ? previewAnd(state, 'confirm') : requote(state, env);

const onReconnect: Handler<'RECONNECT'> = (state, _event, env) => {
  if (state.kind === 'idle') {
    return stay(state);
  }

  return {
    state: {
      ...state,
      run: {
        ...state.run,
        reconnect: { resumeId: resumeAfterReconnect(state.run, env) },
      },
    } as BorrowState,
    effects: [{ type: 'connect' }],
  };
};

const onReconnectFailed: Handler<'RECONNECT_FAILED'> = (state) =>
  state.kind === 'idle'
    ? stay(state)
    : stay({
        ...state,
        run: { ...state.run, reconnect: undefined },
      } as BorrowState);

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

const onOpenListed: Handler<'OPEN_LISTED'> = (state, event, env) => {
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

const onQuoted: Handler<'QUOTED'> = (state, event) => {
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

/** Cancelled elsewhere: nothing went wrong, the borrow is just over. */
const cancelledElsewhere = ({ attempt, executionId }: Run): Transition => ({
  state: { kind: 'idle', attempt },
  effects:
    executionId === undefined
      ? [CLEAR_DELAY]
      : [CLEAR_DELAY, { type: 'notifySettled', executionId }],
});

const onRunFailed: Handler<'RUN_FAILED'> = (state, event, env) => {
  if (!isCurrentRunning(state, event.attempt)) {
    return stay(state);
  }

  if (event.error instanceof ExecutionCancelledError) {
    return cancelledElsewhere(state.run);
  }

  return fail(state.run, event.error, env);
};

const onCancelFailed: Handler<'CANCEL_FAILED'> = (state, event) => {
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

const onDiagnosed: Handler<'DIAGNOSED'> = (state, event) => {
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

const onDelayElapsed: Handler<'DELAY_ELAPSED'> = (state, event) =>
  state.kind === 'tracking' && !state.warning && isCurrent(state, event.attempt)
    ? stay({ ...state, warning: true })
    : stay(state);

// ── The transition ──────────────────────────────────────────────────────

/** One handler per event: each checks the event still applies to the state. */
const HANDLERS: { [T in BorrowEvent['type']]: Handler<T> } = {
  START: onStart,
  CONFIRM: onConfirm,
  RETRY: (state, _event, env) =>
    state.kind === 'error' ? onRetry(state, env) : stay(state),
  REFRESH: onRefresh,
  CLOSE: onClose,
  LEAVE: leave,
  RECONNECT: onReconnect,
  RECONNECT_FAILED: onReconnectFailed,
  WALLET_BACK: (state, _event, env) =>
    state.kind !== 'idle' && state.run.reconnect
      ? onWalletBack(state, env)
      : stay(state),
  RESTORE: (state, event, env) =>
    state.kind === 'idle'
      ? follow(state.attempt, event.execution, event.known, env)
      : stay(state),
  OPEN_LISTED: onOpenListed,
  QUOTED: onQuoted,
  QUOTE_FAILED: (state, event, env) =>
    state.kind === 'quoting' && isCurrent(state, event.attempt)
      ? fail(state.run, event.error, env)
      : stay(state),
  RUNNER: (state, event, env) =>
    isCurrentRunning(state, event.attempt)
      ? onRunnerEvent(state, event.event, env)
      : stay(state),
  RUN_DONE: (state, event) =>
    isCurrentRunning(state, event.attempt)
      ? toDone(state, state.run, event.id)
      : stay(state),
  RUN_FAILED: onRunFailed,
  CANCELLED: (state, event) =>
    isCurrentCancel(state, event.attempt, event.executionId)
      ? afterCancel(state)
      : stay(state),
  CANCEL_FAILED: onCancelFailed,
  DIAGNOSED: onDiagnosed,
  DELAY_ELAPSED: onDelayElapsed,
};

export const transition = (
  state: BorrowState,
  event: BorrowEvent,
  env: FlowEnv,
): Transition => {
  const handle = HANDLERS[event.type] as
    | Handler<BorrowEvent['type']>
    | undefined;

  return handle ? handle(state, event, env) : stay(state);
};
