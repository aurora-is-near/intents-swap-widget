import {
  IntentsConnectActionsApiError,
  IntentsConnectApiError,
} from '@aurora-is-near/intents-connect';

/*
 * Reading what an error says, through everything it wraps: whether the
 * wallet ran out of gas, and the reason the Intents Connect API gave.
 */

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
 * What a changed borrow action is called: the hosted action no longer has
 * the hash Borrow pins (409), so the steps it would run were not reviewed.
 */
export const ACTION_CHANGED_MESSAGE =
  'The borrow action changed; reload to get the update.';

/**
 * The reason the Intents Connect API (or the hosted actions API, resolving
 * the borrow's steps) gave for a failed request, such as
 * `{"error": "No liquidity available"}` from creating an execution, or
 * `undefined` when the error is not an API error or its body is not JSON
 * with a non-empty `error` string. A changed borrow action (the actions
 * API's 409) is `ACTION_CHANGED_MESSAGE`.
 */
export const apiErrorMessage = (error: unknown): string | undefined => {
  const chain = causeChainOf(error);
  const actionsError = chain.find(
    (value): value is IntentsConnectActionsApiError =>
      value instanceof IntentsConnectActionsApiError,
  );

  if (actionsError?.isHashMismatch) {
    return ACTION_CHANGED_MESSAGE;
  }

  const apiError =
    actionsError ??
    chain.find(
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
