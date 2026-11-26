import {
  DepositTransferError,
  ExecutionPollTimeoutError,
  GuardError,
  IntentsConnectApiError,
  isUserRejection,
  parseOriginAsset,
  RunnerDisposedError,
} from '@aurora-is-near/intents-connect';
import type {
  ExecutionRecovery,
  ExecutionStatus,
} from '@aurora-is-near/intents-connect';

import {
  isComingSoon,
  isReserveAvailable,
} from '@/domains/markets/utils/availability';
import { loanValues, ltvBps } from '@/domains/markets/utils/math';
import type {
  BorrowReserve,
  CollateralReserve,
  MarketSnapshot,
} from '@/domains/markets/types';

import { BorrowPreviewError } from './preview';

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

/** Longest API reason shown as is; a longer one is cut. */
const API_ERROR_MAX_LENGTH = 300;

/**
 * The reason the Intents Connect API gave for a failed request, such as
 * `{"error": "No liquidity available"}` from creating an execution, or
 * `undefined` when the error is not an API error or its body is not JSON
 * with a non-empty `error` string.
 */
export const apiErrorMessage = (error: unknown): string | undefined => {
  const apiError = causeChainOf(error).find(
    (value): value is IntentsConnectApiError =>
      value instanceof IntentsConnectApiError,
  );

  const { body } = apiError ?? {};
  const reason =
    body && typeof body === 'object'
      ? (body as { error?: unknown }).error
      : undefined;

  if (typeof reason !== 'string' || reason.trim() === '') {
    return undefined;
  }

  const trimmed = reason.trim();

  return trimmed.length > API_ERROR_MAX_LENGTH
    ? `${trimmed.slice(0, API_ERROR_MAX_LENGTH)}…`
    : trimmed;
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

/**
 * What an error state's button does, by the artboard's action names
 * (`Web-Borrow-Confirm.dc.html` lines 1493–1505 and 1513):
 * - `retry`: run again (rejected, no gas), send the declined deposit
 *   again, or confirm the declined cancellation again;
 * - `refresh`: re-quote and confirm again (the quote or the price moved);
 * - `reconnect`: connect the wallet again (it left mid-borrow);
 * - `close`: close the dialog, tracking a live borrow on (delayed), or back
 *   to the form to borrow less or pick another market (no liquidity, the
 *   artboard's "Choose another market") or another pair (pair unsupported),
 *   to wait for the borrow already on its way (busy), or after an error
 *   nothing explains (unknown).
 */
export type BorrowRecoveryAction = 'retry' | 'refresh' | 'reconnect' | 'close';

export const borrowRecoveryAction = (
  kind: BorrowErrorKind,
): BorrowRecoveryAction => {
  switch (kind) {
    case 'priceMoved':
    case 'quoteMoved':
      return 'refresh';
    case 'walletDisconnected':
      return 'reconnect';
    case 'noLiquidity':
    case 'delayed':
    case 'pairUnsupported':
    case 'busy':
    case 'unknown':
      return 'close';
    default:
      return 'retry';
  }
};

/** The reserve with `asset`'s address, in any case; none for no `asset`. */
const byAsset = <Reserve extends { asset: string }>(
  reserves: readonly Reserve[],
  asset: string | undefined,
) =>
  asset === undefined
    ? undefined
    : reserves.find(
        (reserve) => reserve.asset.toLowerCase() === asset.toLowerCase(),
      );

/** The loan's reserves as `snapshot` lists them. */
export const reservesIn = (
  snapshot: MarketSnapshot,
  loan: {
    collateral?: Pick<CollateralReserve, 'asset'>;
    borrow?: Pick<BorrowReserve, 'asset'>;
  },
): { collateral?: CollateralReserve; borrow?: BorrowReserve } => ({
  collateral: byAsset(snapshot.collateral, loan.collateral?.asset),
  borrow: byAsset(snapshot.borrowable, loan.borrow?.asset),
});

export type LiquidityCheck = 'ok' | 'noLiquidity';

/**
 * Before confirming: whether a freshly read snapshot can still lend
 * `borrowAmount` of `borrow`. A reserve that is gone, or not borrowable now,
 * counts as out of liquidity too.
 */
export const checkLiquidity = (
  snapshot: MarketSnapshot,
  borrow: Pick<BorrowReserve, 'asset'>,
  borrowAmount: bigint,
): LiquidityCheck => {
  const reserve = reservesIn(snapshot, { borrow }).borrow;

  return reserve &&
    isReserveAvailable(reserve) &&
    reserve.availableLiquidity >= borrowAmount
    ? 'ok'
    : 'noLiquidity';
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
  const { collateral: supplied, borrow: borrowed } = reservesIn(snapshot, {
    collateral,
    borrow,
  });

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
