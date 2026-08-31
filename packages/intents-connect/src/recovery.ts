import { DepositTransferError, GuardError } from '@/errors';

/**
 * A recoverable dead-end, classified so a UI renders actions instead of prose.
 *
 * This is the interpretation contract for the runner's error taxonomy — every
 * consumer would otherwise re-derive it with `instanceof` chains, and less
 * completely. Derive it from the error the hook/runner reports:
 *
 * - `resume-or-cancel`: another execution holds the per-wallet in-flight lock
 *   (`EXECUTION_IN_FLIGHT`). Offer `resume(executionId)` — which re-drives
 *   whatever is left of that execution, signature and deposit included — or
 *   `cancel(executionId)` to release the lock.
 * - `retry-transfer`: the deposit transfer was rejected or failed in the
 *   wallet, everything before it is valid and signed server-side. Offer
 *   `retryDeposit()`. `cause` names what actually broke in the wallet.
 *
 * `undefined` means the error (or its absence) has no dedicated recovery
 * action — render it as a plain failure.
 */
export type ExecutionRecovery =
  | { kind: 'resume-or-cancel'; executionId: string }
  | { kind: 'retry-transfer'; executionId: string; cause?: Error };

export const deriveExecutionRecovery = (
  error: unknown,
): ExecutionRecovery | undefined => {
  if (
    error instanceof GuardError &&
    error.code === 'EXECUTION_IN_FLIGHT' &&
    error.meta.executionId
  ) {
    return { kind: 'resume-or-cancel', executionId: error.meta.executionId };
  }

  if (error instanceof DepositTransferError) {
    return {
      kind: 'retry-transfer',
      executionId: error.executionId,
      cause: error.cause instanceof Error ? error.cause : undefined,
    };
  }

  return undefined;
};
