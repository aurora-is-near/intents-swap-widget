import { IntentsConnectApiError } from '@aurora-is-near/intents-connect';

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
