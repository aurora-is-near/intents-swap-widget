/** Base class for every error this package throws. */
export class IntentsConnectError extends Error {
  constructor(message: string, options?: { cause?: unknown }) {
    super(message);
    this.name = 'IntentsConnectError';

    if (options?.cause !== undefined) {
      this.cause = options.cause;
    }
  }
}

/**
 * Normalises an arbitrary thrown value into an `Error` with a readable
 * message.
 *
 * Needed because wallet providers routinely reject with PLAIN OBJECTS rather
 * than `Error` instances — an EIP-1193 rejection travels as
 * `{ code: 4001, message: 'User rejected the request.' }`, and some connectors
 * nest it one level down as `{ error: { code, message } }`. `String(...)` on
 * those renders "[object Object]", which is what a UI would end up showing.
 * The original value is preserved on `cause`.
 */
export const toError = (value: unknown): Error => {
  if (value instanceof Error) {
    return value;
  }

  if (typeof value === 'object' && value !== null) {
    const outer = value as {
      message?: unknown;
      code?: unknown;
      error?: unknown;
    };

    const inner =
      typeof outer.error === 'object' && outer.error !== null
        ? (outer.error as { message?: unknown; code?: unknown })
        : undefined;

    const messages = [outer.message, inner?.message];
    const message = messages.find(
      (candidate): candidate is string => typeof candidate === 'string',
    );

    const code = outer.code ?? inner?.code;

    if (message) {
      return new IntentsConnectError(
        code !== undefined ? `${message} (code ${String(code)})` : message,
        { cause: value },
      );
    }

    try {
      return new IntentsConnectError(JSON.stringify(value), { cause: value });
    } catch {
      // Circular — fall through to String().
    }
  }

  return new IntentsConnectError(String(value), { cause: value });
};

/**
 * How wallets word a rejection when they report no code. Kept in sync with the
 * widget's `isUserDeniedSigning`: Freighter says "User declined access", and
 * several connectors report a dismissed popup as "user closed".
 */
const USER_REJECTION_PROSE =
  /user (rejected|denied|cancell?ed|declined|closed)/i;

const saysRejected = (value: unknown): boolean =>
  typeof value === 'string' && USER_REJECTION_PROSE.test(value);

/**
 * Whether a thrown value is the user declining a wallet prompt.
 *
 * EIP-1193 names it `userRejectedRequest` = 4001, and the major Solana wallets
 * reuse the same code. The code may sit on the value itself, nested one level
 * (`{ error: { code } }`), or on a wrapping Error's `cause`; older providers
 * only say it in prose, hence the message fallback.
 *
 * The prose fallback reads the nested value too, not just `message`: a wallet
 * that reports a rejection IN-BAND (Freighter's `{ error }`) reaches
 * `toError` as a bare string, so it arrives here as a `cause` carrying the
 * only evidence there is.
 */
export const isUserRejection = (value: unknown): boolean => {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const outer = value as {
    code?: unknown;
    message?: unknown;
    error?: unknown;
    cause?: unknown;
  };

  if (outer.code === 4001) {
    return true;
  }

  const inner = outer.error ?? outer.cause;
  const innerObject =
    inner && typeof inner === 'object'
      ? (inner as { code?: unknown; message?: unknown })
      : undefined;

  if (innerObject?.code === 4001) {
    return true;
  }

  return (
    saysRejected(outer.message) ||
    saysRejected(inner) ||
    saysRejected(innerObject?.message)
  );
};

/** A non-2xx response from the Intents Connect API. */
export class IntentsConnectApiError extends IntentsConnectError {
  constructor(
    message: string,
    readonly status: number,
    readonly body?: unknown,
  ) {
    super(message);
    this.name = 'IntentsConnectApiError';
  }

  /**
   * A `dry: false` create is already live for this (intermediary, chain). The
   * caller must wait for a terminal status or delete the open execution.
   */
  get isExecutionInFlight(): boolean {
    return this.status === 409;
  }
}

/**
 * The execution was cancelled through `runner.cancel()`. Distinct from a guard
 * violation: nothing went wrong, the caller asked to stop.
 */
export class ExecutionCancelledError extends IntentsConnectError {
  constructor(readonly executionId: string) {
    super(`execution ${executionId} was cancelled`);
    this.name = 'ExecutionCancelledError';
  }
}

/**
 * The runner was disposed (typically because the bound wallet or account
 * changed) while an execution was still in flight. The execution itself is
 * untouched server-side — reattach with `resume()` from a runner bound to the
 * owning wallet.
 */
export class RunnerDisposedError extends IntentsConnectError {
  constructor(readonly executionId?: string) {
    super(
      'the runner was disposed while an execution was in flight — resume() it from a runner bound to the owning wallet',
    );
    this.name = 'RunnerDisposedError';
  }
}

/**
 * Polling stopped without observing a terminal status. NOT a verdict on the
 * execution — it is still live server-side and may yet succeed. Reattach with
 * `resume(executionId)` to keep watching it.
 */
export class ExecutionPollTimeoutError extends IntentsConnectError {
  constructor(
    readonly executionId: string,
    detail: string,
  ) {
    super(
      `${detail} — the execution is still live server-side; call resume('${executionId}') to keep watching it`,
    );
    this.name = 'ExecutionPollTimeoutError';
  }
}

/**
 * The deposit transfer was rejected or failed in the wallet. The execution is
 * still valid and signed server-side; call `runner.retryDeposit()` to prompt
 * the transfer again.
 */
export class DepositTransferError extends IntentsConnectError {
  constructor(
    readonly executionId: string,
    options?: { cause?: unknown },
  ) {
    super(
      `the deposit transfer for execution ${executionId} was not completed — call retryDeposit() to prompt it again`,
      options,
    );
    this.name = 'DepositTransferError';
  }
}

/**
 * A precondition of the Intents Connect protocol was violated. Every code
 * corresponds to one named guard under `machine/guards/checks`.
 */
export type GuardCode =
  | 'STEPS_REQUIRED'
  | 'FEE_NOT_ESTIMATED'
  | 'FEE_EXCEEDS_AMOUNT'
  | 'QUOTE_MOVED'
  | 'ILLEGAL_STEP_SHAPE'
  | 'DESTINATION_TOKEN_UNTOUCHED'
  | 'RECIPIENT_NOT_ALLOWED'
  | 'STRATEGY_CONFLICT'
  | 'EXECUTION_IN_FLIGHT'
  | 'NO_INTERMEDIARY'
  | 'NETWORK_MISMATCH'
  | 'MEMO_REQUIRED'
  | 'DEPOSIT_BEFORE_SIGNATURE'
  | 'PUBLIC_KEY_MISMATCH'
  | 'NO_SIGNING_PAYLOAD'
  | 'UNSUPPORTED_SIGNING_STANDARD'
  | 'NO_TRANSFER_IMPLEMENTATION'
  | 'WALLET_NOT_CONNECTED';

export type GuardMeta = {
  /** Set by EXECUTION_IN_FLIGHT: the execution holding the lock. */
  executionId?: string;
};

export class GuardError extends IntentsConnectError {
  constructor(
    readonly code: GuardCode,
    message: string,
    /** Structured context, so UIs can act on the error instead of parsing prose. */
    readonly meta: GuardMeta = {},
  ) {
    super(message);
    this.name = 'GuardError';
  }
}

export const failGuard = (
  code: GuardCode,
  message: string,
  meta?: GuardMeta,
): never => {
  throw new GuardError(code, message, meta);
};
