import { ExecutionPollTimeoutError } from '@/errors';
import type { Phase } from '@/machine/phases';
import {
  AWAITING_FUNDS_STATUSES,
  type Execution,
  type ExecutionStatus,
  TERMINAL_STATUSES,
} from '@/types/execution';
import {
  DEPOSIT_DEADLINE_GRACE_MS,
  HOLDING_POLL_BACKOFF_FACTOR,
  MAX_CONSECUTIVE_POLL_ERRORS,
  MAX_HOLDING_POLL_INTERVAL_MS,
} from '@/runner/constants';
import type { RunnerCtx, RunnerState } from '@/runner/ctx';

/**
 * Interruptible sleep: `dispose()` (and a completed `cancel()`) resolve it
 * early via `state.wakeSleepers`, so the loop reaches its checkpoint now
 * instead of after up to a full poll interval — and nothing retains the
 * settle closure (or, under Node/SSR, a live timer) across that gap.
 */
const sleep = (ms: number, state: RunnerState) =>
  new Promise<void>((resolve) => {
    let timer: ReturnType<typeof setTimeout> | undefined;

    const wake = () => {
      clearTimeout(timer);
      state.wakeSleepers.delete(wake);
      resolve();
    };

    timer = setTimeout(wake, ms);
    state.wakeSleepers.add(wake);
  });

/**
 * The phase a non-terminal poll observation should move to, or `undefined`
 * to hold the current one.
 *
 * EXPIRED is soft-terminal: reflect it in the phase and keep polling, because
 * a late deposit revives the execution. Held rather than flipped back each
 * iteration, so the phase mirrors the observed state instead of emitting two
 * events per poll. While `awaiting-deposit`, only a status PAST the
 * awaiting-funds pair means the watcher observed the deposit — the
 * waiting-for-funds hold ends.
 */
export const reconcileSettlePhase = (
  current: Phase,
  status: ExecutionStatus,
): Phase | undefined => {
  if (status === 'EXPIRED') {
    return 'expired';
  }

  if (current === 'expired') {
    return 'settling';
  }

  if (
    current === 'awaiting-deposit' &&
    !AWAITING_FUNDS_STATUSES.includes(status)
  ) {
    return 'settling';
  }

  return undefined;
};

/* ── 7. Settle ───────────────────────────────────────────────────────────
 * The API answers with an array even for a single id.
 *
 * `no-await-in-loop` is disabled deliberately: polling is inherently
 * sequential. Each round must observe the result of the previous sleep, so
 * parallelising the requests would just hammer the API. */
export const settle = async (
  ctx: RunnerCtx,
  executionId: string,
): Promise<Execution> => {
  const {
    api,
    logger,
    machine,
    state,
    to,
    patch,
    emit,
    requireAddress,
    throwIfDisposed,
    throwIfCancelled,
    pollIntervalMs,
    maxPollAttempts,
  } = ctx;

  // The QR / exchange path stays in `awaiting-deposit` until the watcher
  // observes funds — the UI's deposit screen keys off that phase, and the
  // user may take minutes to move funds. `DEPOSIT_PENDING` still counts as
  // waiting: it means signed with the deposit NOT yet observed. Every other
  // entry settles at once.
  const holdingForDeposit = () =>
    machine.current === 'awaiting-deposit' &&
    machine.context.status !== undefined &&
    AWAITING_FUNDS_STATUSES.includes(machine.context.status) &&
    !machine.context.depositTxHash;

  if (!holdingForDeposit()) {
    to('settling');
  }

  // Captured once. Re-reading it per iteration would turn a wallet disconnect
  // during a multi-minute settle into a reported failure for an execution that
  // is completing successfully on-chain.
  const address = requireAddress();

  const deadlineMs = machine.context.deadline
    ? Date.parse(machine.context.deadline)
    : Number.NaN;

  let attempt = 0;
  let consecutiveErrors = 0;
  let holdInterval = pollIntervalMs;

  while (attempt < maxPollAttempts) {
    throwIfDisposed();
    throwIfCancelled(executionId);

    let execution: Execution | undefined;

    try {
      // eslint-disable-next-line no-await-in-loop
      [execution] = await api.listExecutions(address, { id: executionId });
      consecutiveErrors = 0;
    } catch (error) {
      // One transient failure must not report a live execution as failed;
      // only a persistently unreachable API escalates.
      consecutiveErrors += 1;

      if (consecutiveErrors >= MAX_CONSECUTIVE_POLL_ERRORS) {
        throw error;
      }

      logger.warn(
        `poll for execution ${executionId} failed (${consecutiveErrors}/${MAX_CONSECUTIVE_POLL_ERRORS} consecutive) — retrying`,
        error,
      );
    }

    // Re-checked AFTER the round-trip, not only before it. A cancel() or
    // dispose() that landed while this poll was in flight has already wiped
    // the context and rebound the runner's owner, so writing the response
    // below would resurrect a deleted execution and emit through an onEvent
    // that is no longer ours.
    throwIfDisposed();
    throwIfCancelled(executionId);

    if (execution) {
      // Patch and emit only on change: every React consumer re-renders per
      // event, and settling can span hundreds of identical polls.
      if (execution.status !== machine.context.status) {
        patch({ execution, status: execution.status });
        emit({ type: 'status', status: execution.status });
      }

      if (TERMINAL_STATUSES.includes(execution.status)) {
        if (execution.status === 'SUCCESS') {
          to('success');

          return execution;
        }

        to('failed');

        throw new Error(`execution ${execution.status}`);
      }

      const next = reconcileSettlePhase(machine.current, execution.status);

      if (next) {
        to(next);
      }
    }

    // While waiting on user funds, the clock is the quote deadline, not the
    // poll budget: burning the attempts while the user is still moving funds
    // through an exchange would declare a live execution failed.
    const withinDepositWindow =
      holdingForDeposit() &&
      Number.isFinite(deadlineMs) &&
      Date.now() < deadlineMs + DEPOSIT_DEADLINE_GRACE_MS;

    if (!withinDepositWindow) {
      attempt += 1;
    }

    if (attempt < maxPollAttempts) {
      // The deposit-window hold can span ~15 minutes by default, so its
      // interval backs off — detection latency barely matters while the user
      // is still routing funds. Keyed on the WINDOW, not the hold: once
      // attempts start counting, they must burn at pollIntervalMs, or the
      // timeout stretches from minutes to hours. Updated before the await so
      // the read/advance pair stays together.
      const delayMs = withinDepositWindow ? holdInterval : pollIntervalMs;

      holdInterval = withinDepositWindow
        ? Math.min(
            holdInterval * HOLDING_POLL_BACKOFF_FACTOR,
            MAX_HOLDING_POLL_INTERVAL_MS,
          )
        : pollIntervalMs;

      // eslint-disable-next-line no-await-in-loop
      await sleep(delayMs, state);
    }
  }

  const expired = machine.current === 'expired';

  to('failed');

  // Typed, and explicit that this is NOT a verdict: the execution is still
  // live server-side and `resume()` reattaches to it.
  throw new ExecutionPollTimeoutError(
    executionId,
    expired
      ? `execution ${executionId} expired and was not revived within ${maxPollAttempts} polls`
      : `polling timed out after ${maxPollAttempts} attempts for execution ${executionId}`,
  );
};
