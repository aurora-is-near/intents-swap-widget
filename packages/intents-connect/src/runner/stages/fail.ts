import {
  DepositTransferError,
  ExecutionCancelledError,
  RunnerDisposedError,
  toError,
} from '@/errors';
import type { RunnerCtx } from '@/runner/ctx';

/** Shared failure handling: record it, announce it, then rethrow. */
export const fail = (ctx: RunnerCtx, error: unknown): never => {
  const { machine, state, patch, emit, to } = ctx;
  const failure = toError(error);

  // A cancellation is not a failure: nothing went wrong, the caller asked to
  // stop. cancel() already cleared `error` and moved the machine — recording
  // the checkpoint's throw here would undo that cleanup and make a UI keyed
  // off `error` render the deliberate cancel as a failure.
  //
  // Tested by OWNERSHIP first, because the error type alone misses the
  // auto-cancel path: a rejected signature that cancel() cleaned up still
  // rethrows the ORIGINAL rejection, not an ExecutionCancelledError. If the
  // execution this flow was driving is already deleted, there is nothing left
  // to record a failure against.
  //
  // A disposal is not a failure either: the execution is untouched
  // server-side and resumable from a correctly bound runner, and dispose()'s
  // contract is that the orphaned run stops emitting — patching and emitting
  // here would surface a spurious failure through the shared onEvent right
  // after a normal account switch.
  const { executionId } = machine.context;
  const alreadyCancelled =
    executionId !== undefined && state.cancelledExecutionIds.has(executionId);

  if (
    alreadyCancelled ||
    failure instanceof ExecutionCancelledError ||
    failure instanceof RunnerDisposedError
  ) {
    throw failure;
  }

  patch({ error: failure });
  emit({ type: 'error', error: failure });

  // A rejected deposit transfer is retryable — the execution is still valid
  // and signed, so the machine stays in `awaiting-deposit` for
  // `retryDeposit()`. A cancellation already moved the machine to
  // `cancelled`. Anything else is a failure, including one raised before any
  // phase progress.
  const retryable = failure instanceof DepositTransferError;

  if (
    !retryable &&
    machine.current !== 'cancelled' &&
    machine.current !== 'failed'
  ) {
    to('failed');
  }

  throw failure;
};
