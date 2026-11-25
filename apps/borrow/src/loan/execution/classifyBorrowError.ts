import {
  DepositTransferError,
  ExecutionPollTimeoutError,
  type ExecutionRecovery,
  type ExecutionStatus,
  GuardError,
  isUserRejection,
  parseOriginAsset,
  RunnerDisposedError,
} from '@aurora-is-near/intents-connect';

import { isComingSoon } from '../../markets/availability';
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
 * tracking continues), and anything else; plus a pair the borrow action no
 * longer covers (no artboard).
 */
export type BorrowErrorKind =
  | 'rejected'
  | 'noGas'
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
export type BorrowStepFailure =
  | 'priceMoved'
  | 'noLiquidity'
  /** The pair is `coming-soon` now: the borrow action does not cover it. */
  | 'pairUnsupported';

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
 * Which error state a failed borrow is, first match wins:
 *
 * 1. The user declined a wallet prompt (`isUserRejection`, the deposit
 *    transfer's cause included): `rejected`.
 * 2. The gas pre-check failed, or the wallet reports insufficient funds for
 *    the deposit transaction: `noGas`.
 * 3. The quote moved (the SDK's `QUOTE_MOVED` guard, from
 *    `quoteMustNotHaveMoved`, or the two-pass preview's `quoteMoved`), or
 *    the borrow step failed because the collateral's price moved:
 *    `priceMoved`.
 * 4. The liquidity pre-check failed, or the borrow step failed for want of
 *    liquidity: `noLiquidity`.
 * 5. A steps-only retry found the pair no longer covered by the borrow
 *    action, or the borrow step failed on such a pair: `pairUnsupported`.
 * 6. Polling stopped before a terminal status
 *    (`ExecutionPollTimeoutError`), or the borrow has been pending longer
 *    than `BORROW_DELAYED_AFTER_MS`: `delayed`. A warning; the execution is
 *    still live.
 * 7. Anything else: `unknown`.
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
    (error instanceof GuardError && error.code === 'QUOTE_MOVED') ||
    (error instanceof BorrowPreviewError && error.reason === 'quoteMoved') ||
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
    (error instanceof BorrowPreviewError &&
      error.reason === 'pairUnsupported') ||
    (context.status === 'OPERATION_FAILED' &&
      context.borrowStep === 'pairUnsupported')
  ) {
    return 'pairUnsupported';
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
 * What an error state's button does, by the artboard's action names
 * (`Web-Borrow-Confirm.dc.html` lines 1493–1505 and 1513):
 * - `retry`: run again (rejected, no gas, unknown);
 * - `refresh`: re-quote and confirm again (the price moved);
 * - `reconnect`: connect the wallet again (it left mid-borrow);
 * - `close`: close the dialog, tracking a live borrow on (delayed), or back
 *   to the form to borrow less or pick another market (no liquidity, the
 *   artboard's "Choose another market") or another pair (pair unsupported).
 */
export type BorrowRecoveryAction = 'retry' | 'refresh' | 'reconnect' | 'close';

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
      return 'refresh';
    case 'noLiquidity':
    case 'delayed':
    case 'pairUnsupported':
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
 * Why a borrow step most likely failed, from a fresh snapshot: the borrow
 * action no longer covers the pair (`pairUnsupported`, checked first, so it
 * is not read as a lack of liquidity), the market can no longer lend the
 * amount (`noLiquidity`), or at the oracle's prices now the loan is above
 * the collateral's max LTV (`priceMoved`). `undefined` when none explains it.
 */
export const diagnoseBorrowStep = ({
  snapshot,
  collateral,
  borrow,
  collateralAmount,
  borrowAmount,
}: DiagnoseBorrowStepInput): BorrowStepFailure | undefined => {
  const supplied = snapshot.collateral.find(({ asset }) =>
    sameAsset(asset, collateral.asset),
  );

  const borrowed = snapshot.borrowable.find(({ asset }) =>
    sameAsset(asset, borrow.asset),
  );

  if (
    [supplied, borrowed].some(
      (reserve) => reserve !== undefined && isComingSoon(reserve),
    )
  ) {
    return 'pairUnsupported';
  }

  if (checkLiquidity(snapshot, borrow, borrowAmount) === 'noLiquidity') {
    return 'noLiquidity';
  }

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
