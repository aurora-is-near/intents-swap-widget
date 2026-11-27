import {
  DepositTransferError,
  ExecutionPollTimeoutError,
  GuardError,
  isUserRejection,
  RunnerDisposedError,
} from '@aurora-is-near/intents-connect';
import type {
  ExecutionRecovery,
  ExecutionStatus,
} from '@aurora-is-near/intents-connect';

import { BorrowPreCheckError } from './borrowPreChecks';
import { isInsufficientFunds } from './errorCauses';
import { BorrowPreviewError } from './preview';
import type { BorrowPreCheckReason } from './borrowPreChecks';
import type { BorrowStepFailure } from './diagnoseBorrowStep';

/**
 * The borrow error states. Six follow the error artboards
 * (`Web-Borrow-Confirm.dc.html` lines 1493–1505): signature rejected
 * (`rejected`), not enough gas, collateral price moved, market out of
 * liquidity, delivery taking longer (`delayed`, a warning: tracking
 * continues) and anything else (`unknown`). The rest have no artboard: a
 * declined deposit, a declined cancellation, another borrow holding the
 * wallet's lock (`busy`), a disconnected wallet, a quote that moved and a
 * pair the borrow action no longer covers.
 */
export type BorrowErrorKind =
  | 'rejected'
  | 'depositRejected'
  | 'cancelDeclined'
  | 'busy'
  | 'walletDisconnected'
  | 'noGas'
  | 'quoteMoved'
  | 'priceMoved'
  | 'noLiquidity'
  | 'delayed'
  | 'pairUnsupported'
  | 'unknown';

/**
 * A pending borrow is "taking longer than usual" past this long since its
 * signature: a bridge-in and the Aave steps usually settle in a few minutes.
 */
export const BORROW_DELAYED_AFTER_MS = 5 * 60 * 1000;

export type BorrowErrorContext = {
  /** The execution's last server status, when one was created. */
  status?: ExecutionStatus;
  /**
   * For an `OPERATION_FAILED` execution: what a fresh snapshot says about
   * the borrow step (`diagnoseBorrowStep`); `undefined` when it explains
   * nothing or could not be read.
   */
  borrowStep?: BorrowStepFailure;
};

/** What the classifier rules read about a failed borrow. */
type BorrowFailure = {
  error: unknown;
  /** The cause of a `retry-transfer` recovery: the declined deposit. */
  transferCause: unknown;
  context: BorrowErrorContext;
};

const isGuard = (error: unknown, code: GuardError['code']) =>
  error instanceof GuardError && error.code === code;

const isPreCheck = (error: unknown, reason: BorrowPreCheckReason) =>
  error instanceof BorrowPreCheckError && error.reason === reason;

const isPreview = (error: unknown, reason: BorrowPreviewError['reason']) =>
  error instanceof BorrowPreviewError && error.reason === reason;

/** The execution failed at its borrow step, for `step` as diagnosed. */
const borrowStepFailed = (
  { status, borrowStep }: BorrowErrorContext,
  step: BorrowStepFailure,
) => status === 'OPERATION_FAILED' && borrowStep === step;

/** `classifyBorrowError`'s rules, in its documented order: first match wins. */
const CLASSIFIER_RULES: readonly {
  kind: BorrowErrorKind;
  matches: (failure: BorrowFailure) => boolean;
}[] = [
  {
    kind: 'depositRejected',
    matches: ({ error, transferCause }) =>
      (transferCause !== undefined && isUserRejection(transferCause)) ||
      (error instanceof DepositTransferError && isUserRejection(error.cause)),
  },
  {
    kind: 'rejected',
    matches: ({ error }) => error !== undefined && isUserRejection(error),
  },
  {
    kind: 'busy',
    matches: ({ error }) => isGuard(error, 'EXECUTION_IN_FLIGHT'),
  },
  {
    kind: 'walletDisconnected',
    matches: ({ error }) =>
      error instanceof RunnerDisposedError ||
      isGuard(error, 'WALLET_NOT_CONNECTED'),
  },
  {
    kind: 'noGas',
    matches: ({ error, transferCause }) =>
      isPreCheck(error, 'noGas') ||
      isInsufficientFunds(error) ||
      isInsufficientFunds(transferCause),
  },
  {
    kind: 'quoteMoved',
    matches: ({ error }) =>
      isGuard(error, 'QUOTE_MOVED') || isPreview(error, 'quoteMoved'),
  },
  {
    kind: 'priceMoved',
    matches: ({ context }) => borrowStepFailed(context, 'priceMoved'),
  },
  {
    kind: 'noLiquidity',
    matches: ({ error, context }) =>
      isPreCheck(error, 'noLiquidity') ||
      borrowStepFailed(context, 'noLiquidity'),
  },
  {
    kind: 'pairUnsupported',
    matches: ({ error, context }) =>
      isPreview(error, 'pairUnsupported') ||
      borrowStepFailed(context, 'pairUnsupported'),
  },
  {
    kind: 'delayed',
    matches: ({ error }) => error instanceof ExecutionPollTimeoutError,
  },
];

/**
 * Which error state a failed borrow is, first match wins:
 *
 * 1. The user declined the deposit transfer, after signing
 *    (`DepositTransferError`, or a `retry-transfer` recovery, with a
 *    rejected cause): `depositRejected`.
 * 2. The user declined another wallet prompt (`isUserRejection`):
 *    `rejected`.
 * 3. Another execution holds the wallet's in-flight lock (the SDK's
 *    `EXECUTION_IN_FLIGHT` guard): `busy`.
 * 4. The wallet left mid-borrow (the SDK's `WALLET_NOT_CONNECTED` guard, or
 *    its runner was disposed with the wallet): `walletDisconnected`.
 * 5. The gas pre-check failed, or the wallet reports insufficient funds for
 *    the deposit transaction: `noGas`.
 * 6. The bridge quote moved before anything was signed (the SDK's
 *    `QUOTE_MOVED` guard, or the two-pass preview's `quoteMoved`):
 *    `quoteMoved`.
 * 7. The borrow step failed because the collateral's price moved:
 *    `priceMoved`.
 * 8. The liquidity pre-check failed, or the borrow step failed for want of
 *    liquidity: `noLiquidity`.
 * 9. A steps-only retry found the pair no longer covered by the borrow
 *    action, or the borrow step failed on such a pair: `pairUnsupported`.
 * 10. Polling stopped before a terminal status
 *    (`ExecutionPollTimeoutError`): `delayed`. A warning; the execution is
 *    still live. (A borrow pending past `BORROW_DELAYED_AFTER_MS` is warned
 *    of by the flow's own timer, not classified here.)
 * 11. Anything else: `unknown`.
 *
 * `cancelDeclined` and `busy` for an open execution are set by the flow
 * itself (`flow/transition.ts`): `cancelDeclined` when the user declines the
 * cancellation of an execution that blocks the next borrow.
 *
 * `recovery` must
 * describe `error` itself (`deriveExecutionRecovery(error)`), never an
 * earlier error's: a stale `retry-transfer` with a rejected cause would make
 * any later failure `rejected`.
 */
export const classifyBorrowError = (
  error: unknown,
  recovery: ExecutionRecovery | undefined,
  context: BorrowErrorContext = {},
): BorrowErrorKind => {
  const failure: BorrowFailure = {
    error,
    transferCause:
      recovery?.kind === 'retry-transfer' ? recovery.cause : undefined,
    context,
  };

  return (
    CLASSIFIER_RULES.find(({ matches }) => matches(failure))?.kind ?? 'unknown'
  );
};
