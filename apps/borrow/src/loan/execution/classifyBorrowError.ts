import {
  DepositTransferError,
  ExecutionPollTimeoutError,
  type ExecutionRecovery,
  type ExecutionStatus,
  GuardError,
  IntentsConnectApiError,
  isUserRejection,
  parseOriginAsset,
  RunnerDisposedError,
} from '@aurora-is-near/intents-connect';

import { loanValues, ltvBps } from '../../markets/math';
import type {
  BorrowReserve,
  CollateralReserve,
  MarketSnapshot,
} from '../../markets/types';
import { checkLiquidity } from './liquidity';
import { BorrowPreviewError } from './preview';

/**
 * The borrow error states, one per error artboard (`Web-Borrow-Confirm
 * .dc.html` lines 1493–1505): signature rejected, not enough gas, collateral
 * price moved, market out of liquidity, delivery taking longer (a warning:
 * tracking continues), and anything else. Two have no artboard and reuse
 * the error dialog: no route for the amount (`noRoute`: 1Click can't quote
 * it, so nothing is created), and the quote changed while the loan was
 * being prepared (`quoteChanged`: a two-pass dry run, before anything new
 * is signed; on a steps-only retry the collateral already waits). Two more
 * have no artboard either: another execution holds the wallet's in-flight
 * lock (`inFlight`: the SDK's `EXECUTION_IN_FLIGHT` guard, offered Resume
 * and Cancel), and the signed borrow's deposit transfer failed
 * (`transferFailed`, offered Retry transfer).
 */
export type BorrowErrorKind =
  | 'rejected'
  | 'noGas'
  | 'inFlight'
  | 'transferFailed'
  | 'noRoute'
  | 'quoteChanged'
  | 'priceMoved'
  | 'noLiquidity'
  | 'delayed'
  | 'unknown';

/**
 * A pending borrow is "taking longer than usual" past this long since its
 * signature: a bridge-in and the Aave steps usually settle in a few minutes.
 */
export const BORROW_DELAYED_AFTER_MS = 5 * 60 * 1000;

export type BorrowPreCheckReason = 'noGas' | 'noLiquidity';

/**
 * A check before the borrow is signed refused it: the origin chain has no
 * gas left for the deposit (`noGas`), or the market can't lend the amount
 * (`noLiquidity`). Nothing was created or spent.
 */
export class BorrowPreCheckError extends Error {
  readonly reason: BorrowPreCheckReason;

  constructor(reason: BorrowPreCheckReason, message: string) {
    super(message);
    this.name = 'BorrowPreCheckError';
    this.reason = reason;
  }
}

/** Why the borrow step failed after the collateral arrived, read afresh. */
export type BorrowStepFailure = 'priceMoved' | 'noLiquidity';

export type BorrowErrorContext = {
  /** The execution's last server status, when one was created. */
  status?: ExecutionStatus;
  /**
   * For an `OPERATION_FAILED` execution: what a fresh snapshot says about
   * the borrow step (`diagnoseBorrowStep`); `undefined` when it explains
   * nothing or could not be read.
   */
  borrowStep?: BorrowStepFailure;
  /** How long the borrow has been pending since its signature, in ms. */
  pendingMs?: number;
};

/** Each value an error wraps: `cause`, a wallet's nested `error`, and so on. */
const causeChainOf = (value: unknown): unknown[] => {
  const seen: unknown[] = [];
  let current = value;

  while (
    current !== undefined &&
    current !== null &&
    !seen.includes(current) &&
    seen.length < 8
  ) {
    seen.push(current);

    if (typeof current !== 'object') {
      break;
    }

    const { cause, error } = current as { cause?: unknown; error?: unknown };

    current = cause ?? error;
  }

  return seen;
};

/**
 * How wallets and clients word "not enough to pay for gas": EIP-1474's
 * `insufficient funds for gas * price + value`, ethers' `INSUFFICIENT_FUNDS`
 * code, viem's `InsufficientFundsError`, and Solana's lamports and
 * fee-payer errors.
 */
const INSUFFICIENT_FUNDS =
  /insufficient funds|insufficient lamports|insufficient balance for (fee|rent)|no record of a prior credit/i;

const saysInsufficientFunds = (value: unknown): boolean => {
  if (typeof value === 'string') {
    return INSUFFICIENT_FUNDS.test(value);
  }

  if (!value || typeof value !== 'object') {
    return false;
  }

  const { code, name, message, shortMessage } = value as {
    code?: unknown;
    name?: unknown;
    message?: unknown;
    shortMessage?: unknown;
  };

  return (
    code === 'INSUFFICIENT_FUNDS' ||
    name === 'InsufficientFundsError' ||
    (typeof message === 'string' && INSUFFICIENT_FUNDS.test(message)) ||
    (typeof shortMessage === 'string' && INSUFFICIENT_FUNDS.test(shortMessage))
  );
};

/** The wallet could not pay for the deposit transaction's gas. */
export const isInsufficientFunds = (value: unknown): boolean =>
  causeChainOf(value).some(saysInsufficientFunds);

/**
 * How the Intents Connect API words a quote it can't make: 1Click has no
 * route (`IntentsConnectApiError: No liquidity available`), or the amount is
 * too small, its 400 saying the estimated gas fee exceeds the minimum (or
 * expected) output amount.
 */
const NO_ROUTE =
  /no liquidity available|estimated gas fee\b.*\bexceeds\b.*\b(minimum|expected) output amount/i;

const saysNoRoute = (value: unknown): boolean => {
  if (typeof value === 'string') {
    return NO_ROUTE.test(value);
  }

  if (!value || typeof value !== 'object') {
    return false;
  }

  const { message, body } = value as { message?: unknown; body?: unknown };
  const bodyMessage =
    value instanceof IntentsConnectApiError && body && typeof body === 'object'
      ? (body as { message?: unknown }).message
      : undefined;

  return (
    (typeof message === 'string' && NO_ROUTE.test(message)) ||
    (typeof bodyMessage === 'string' && NO_ROUTE.test(bodyMessage))
  );
};

/**
 * The quote for the amount could not be made, so the create call failed
 * before anything was signed or sent. Not `noLiquidity`: that is the Aave
 * reserve unable to lend.
 */
export const isNoRoute = (value: unknown): boolean =>
  causeChainOf(value).some(saysNoRoute);

/**
 * Which error state a failed borrow is, first match wins:
 *
 * 1. The user declined a wallet prompt (`isUserRejection`, the deposit
 *    transfer's cause included): `rejected`.
 * 2. The gas pre-check failed, or the wallet reports insufficient funds for
 *    the deposit transaction: `noGas`.
 * 3. Another execution holds the wallet's in-flight lock: the SDK's
 *    `EXECUTION_IN_FLIGHT` guard, or a `resume-or-cancel` recovery:
 *    `inFlight`.
 * 4. The signed borrow's deposit transfer failed for another reason than
 *    those above: a `retry-transfer` recovery, or a `DepositTransferError`:
 *    `transferFailed`.
 * 5. The API could not quote the amount (`isNoRoute`, anywhere in the cause
 *    chain): no liquidity for the route, or the estimated gas fee exceeds
 *    the output: `noRoute`.
 * 6. A two-pass preview's minimum received fell by more than its buffer
 *    (`BorrowPreviewError` `quoteMoved`): `quoteChanged`. Nothing new was
 *    signed; on a steps-only retry the collateral already waits, which the
 *    copy and the dialog's step marks say (`fundsWaiting`).
 * 7. The SDK's `QUOTE_MOVED` guard (`quoteMustNotHaveMoved`) refused the
 *    run, or the borrow step failed because the collateral's price moved:
 *    `priceMoved`.
 * 8. The liquidity pre-check failed, or the borrow step failed for want of
 *    liquidity: `noLiquidity`.
 * 9. Polling stopped before a terminal status
 *    (`ExecutionPollTimeoutError`), or the borrow has been pending longer
 *    than `BORROW_DELAYED_AFTER_MS`: `delayed`. A warning; the execution is
 *    still live.
 * 10. Anything else: `unknown`.
 *
 * `error` may be `undefined` for a borrow that is only slow.
 */
export const classifyBorrowError = (
  error: unknown,
  recovery: ExecutionRecovery | undefined,
  context: BorrowErrorContext = {},
): BorrowErrorKind => {
  const transferCause =
    recovery?.kind === 'retry-transfer' ? recovery.cause : undefined;

  if (
    (error !== undefined && isUserRejection(error)) ||
    (transferCause !== undefined && isUserRejection(transferCause)) ||
    (error instanceof DepositTransferError && isUserRejection(error.cause))
  ) {
    return 'rejected';
  }

  if (
    (error instanceof BorrowPreCheckError && error.reason === 'noGas') ||
    isInsufficientFunds(error) ||
    isInsufficientFunds(transferCause)
  ) {
    return 'noGas';
  }

  if (
    (error instanceof GuardError && error.code === 'EXECUTION_IN_FLIGHT') ||
    recovery?.kind === 'resume-or-cancel'
  ) {
    return 'inFlight';
  }

  if (
    recovery?.kind === 'retry-transfer' ||
    error instanceof DepositTransferError
  ) {
    return 'transferFailed';
  }

  if (error !== undefined && isNoRoute(error)) {
    return 'noRoute';
  }

  if (error instanceof BorrowPreviewError && error.reason === 'quoteMoved') {
    return 'quoteChanged';
  }

  if (
    (error instanceof GuardError && error.code === 'QUOTE_MOVED') ||
    (context.status === 'OPERATION_FAILED' &&
      context.borrowStep === 'priceMoved')
  ) {
    return 'priceMoved';
  }

  if (
    (error instanceof BorrowPreCheckError && error.reason === 'noLiquidity') ||
    (context.status === 'OPERATION_FAILED' &&
      context.borrowStep === 'noLiquidity')
  ) {
    return 'noLiquidity';
  }

  if (
    error instanceof ExecutionPollTimeoutError ||
    (error === undefined &&
      context.pendingMs !== undefined &&
      context.pendingMs > BORROW_DELAYED_AFTER_MS)
  ) {
    return 'delayed';
  }

  return 'unknown';
};

/**
 * The execution holding the wallet's in-flight lock, from the
 * `EXECUTION_IN_FLIGHT` guard (its `meta`, else its message) or a
 * `resume-or-cancel` recovery; `undefined` when neither names one.
 */
export const lockingExecutionId = (
  error: unknown,
  recovery: ExecutionRecovery | undefined,
): string | undefined => {
  if (error instanceof GuardError && error.code === 'EXECUTION_IN_FLIGHT') {
    const named =
      error.meta.executionId ??
      /execution (\S+) is already in progress/.exec(error.message)?.[1];

    if (named !== undefined) {
      return named;
    }
  }

  return recovery?.kind === 'resume-or-cancel'
    ? recovery.executionId
    : undefined;
};

/**
 * What an error state's button does, by the artboard's action names
 * (`Web-Borrow-Confirm.dc.html` lines 1493–1505 and 1513):
 * - `retry`: run again (rejected, no gas, unknown);
 * - `resumeExisting`: follow the execution that holds the wallet's lock
 *   (in flight);
 * - `retryTransfer`: prompt the signed borrow's deposit transfer again
 *   (transfer failed);
 * - `refresh`: re-quote and confirm again (the price moved, the quote
 *   changed);
 * - `reconnect`: connect the wallet again (it left mid-borrow);
 * - `close`: close the dialog, tracking a live borrow on (delayed), or back
 *   to the form to borrow less or pick another market (no liquidity, the
 *   artboard's "Choose another market"), or to try a larger amount or
 *   another asset or chain (no route).
 */
export type BorrowRecoveryAction =
  | 'retry'
  | 'refresh'
  | 'reconnect'
  | 'close'
  | 'resumeExisting'
  | 'retryTransfer';

export const borrowRecoveryAction = (
  kind: BorrowErrorKind,
  cause: unknown,
): BorrowRecoveryAction => {
  if (
    cause instanceof RunnerDisposedError ||
    (cause instanceof GuardError && cause.code === 'WALLET_NOT_CONNECTED')
  ) {
    return 'reconnect';
  }

  switch (kind) {
    case 'priceMoved':
    case 'quoteChanged':
      return 'refresh';
    case 'inFlight':
      return 'resumeExisting';
    case 'transferFailed':
      return 'retryTransfer';
    case 'noRoute':
    case 'noLiquidity':
    case 'delayed':
      return 'close';
    default:
      return 'retry';
  }
};

export type DiagnoseBorrowStepInput = {
  /** The market, read after the failure. */
  snapshot: MarketSnapshot;
  collateral: Pick<CollateralReserve, 'asset'>;
  borrow: Pick<BorrowReserve, 'asset'>;
  /** The collateral supplied: the quote's minimum received, atomic. */
  collateralAmount: bigint;
  /** What the plan borrowed, atomic. */
  borrowAmount: bigint;
};

const sameAsset = (a: string, b: string) => a.toLowerCase() === b.toLowerCase();

/**
 * Why a borrow step most likely failed, from a fresh snapshot: the market
 * can no longer lend the amount (`noLiquidity`), or at the oracle's prices
 * now the loan is above the collateral's max LTV (`priceMoved`).
 * `undefined` when neither explains it.
 */
export const diagnoseBorrowStep = ({
  snapshot,
  collateral,
  borrow,
  collateralAmount,
  borrowAmount,
}: DiagnoseBorrowStepInput): BorrowStepFailure | undefined => {
  if (checkLiquidity(snapshot, borrow, borrowAmount) === 'noLiquidity') {
    return 'noLiquidity';
  }

  const supplied = snapshot.collateral.find(({ asset }) =>
    sameAsset(asset, collateral.asset),
  );

  const borrowed = snapshot.borrowable.find(({ asset }) =>
    sameAsset(asset, borrow.asset),
  );

  if (!supplied || !borrowed) {
    return undefined;
  }

  const { collateralValue, debt } = loanValues({
    collateralAmount,
    collateral: supplied,
    borrowAmount,
    borrow: borrowed,
  });

  const ltv = ltvBps(debt, collateralValue);

  return ltv === null || ltv > BigInt(supplied.maxLtvBps)
    ? 'priceMoved'
    : undefined;
};

/** What the gas pre-check reads: the funding rows and what is paid. */
export type GasPreCheckInput = {
  /**
   * The wallet's non-zero balances (`useFundingAssets().rows`), or
   * `undefined` while they are not read: the check is then skipped.
   */
  rows: readonly { assetId: string; amount: bigint }[] | undefined;
  /** The token paid with. */
  origin: { assetId: string; chain: string; contractAddress?: string };
  /** What is paid, in the origin token's atomic units. */
  amount: bigint;
};

/** The origin chain's gas token, as 1Click names it (`nep141:base.omft.near`). */
const isNativeOn = (assetId: string, chain: string) => {
  const parsed = parseOriginAsset(assetId);

  return parsed?.chain === chain && parsed.tokenAddress === undefined;
};

/**
 * Whether the wallet has gas left on the origin chain for the deposit
 * transaction, from the funding rows: some of the chain's gas token beyond
 * what is paid with it. `unknown` when the rows are not read, or the gas
 * token can't be told apart on that chain.
 *
 * The rows hold non-zero balances only, so a missing gas token is a zero
 * balance, assumed only when the paid token is itself a bridged
 * (`*.omft.near`) asset on that chain: the chain's gas token is then named
 * the same way and would be listed if held.
 */
export const checkOriginGas = ({
  rows,
  origin,
  amount,
}: GasPreCheckInput): 'ok' | 'short' | 'unknown' => {
  if (!rows) {
    return 'unknown';
  }

  const native = rows.find(({ assetId }) => isNativeOn(assetId, origin.chain));
  const payingNative = isNativeOn(origin.assetId, origin.chain);

  if (!native && !payingNative) {
    return parseOriginAsset(origin.assetId)?.chain === origin.chain
      ? 'short'
      : 'unknown';
  }

  const balance = native?.amount ?? 0n;
  const spent = payingNative ? amount : 0n;

  return balance > spent ? 'ok' : 'short';
};
