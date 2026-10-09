import {
  DepositTransferError,
  ExecutionPollTimeoutError,
  GuardError,
  IntentsConnectApiError,
  isUserRejection,
} from '@aurora-is-near/intents-connect';
import type { Chains, Token } from '@aurora-is-near/intents-swap-widget';

import type { WalletAccount } from '../accounts/types';
import { chainLabel } from '../screens/transfer/summary';
import { describeServiceError } from './serviceErrors';

/** Gas tokens of the chains a wallet most often pays from. */
const GAS_TOKENS: Partial<Record<Chains, string>> = {
  eth: 'ETH',
  base: 'ETH',
  arb: 'ETH',
  op: 'ETH',
  scroll: 'ETH',
  pol: 'POL',
  bsc: 'BNB',
  avax: 'AVAX',
  gnosis: 'xDAI',
  sol: 'SOL',
  near: 'NEAR',
};

/** Every message in the error and what it wraps, lowercased, for matching. */
const messagesOf = (error: unknown): string => {
  const parts: string[] = [];
  let current: unknown = error;

  for (let depth = 0; current && depth < 5; depth += 1) {
    if (current instanceof Error) {
      parts.push(current.message);
      current = current.cause;
    } else if (typeof current === 'object' && 'message' in current) {
      parts.push(String((current as { message: unknown }).message));
      break;
    } else {
      parts.push(String(current));
      break;
    }
  }

  return parts.join(' ').toLowerCase();
};

/** The user declined a wallet prompt (signature or transfer). */
export const isDeclined = (error: Error) =>
  isUserRejection(error) ||
  isUserRejection(error.cause) ||
  /\b(user )?(rejected|declined|denied)\b|cancell?ed by (the )?user/.test(
    messagesOf(error),
  );

type Context = {
  account: WalletAccount;
  /** The token being deposited, for "not enough X" messages. */
  token?: Token;
};

/**
 * A short, plain message for an app-deposit error — never the raw wallet,
 * viem or service text, which carries hashes, calldata and stack-like detail.
 * The original goes to the console for debugging.
 */
export const friendlyError = (error: Error, { account, token }: Context) => {
  // eslint-disable-next-line no-console
  console.warn('[apps] deposit error', error);

  const text = messagesOf(error);
  const { name } = account;
  const chain = token ? chainLabel(token.blockchain) : 'its network';
  const gas = (token && GAS_TOKENS[token.blockchain]) ?? 'gas token';
  const isTransfer = error instanceof DepositTransferError;

  if (isDeclined(error)) {
    return isTransfer
      ? `You declined the transfer in ${name}. Retry to send it, or cancel the deposit.`
      : `You declined the request in ${name}. Nothing was sent.`;
  }

  if (
    /(not enough|insufficient).{0,40}(gas|fee)|for gas|gas required exceeds|intrinsic gas/.test(
      text,
    )
  ) {
    return `Not enough ${gas} on ${chain} to pay the network fee. Add a little ${gas} to ${name} and retry.`;
  }

  if (
    /insufficient (funds|balance)|exceeds balance|transfer amount exceeds/.test(
      text,
    )
  ) {
    return `${name} doesn’t have enough ${token?.symbol ?? 'funds'} on ${chain} for this deposit.`;
  }

  if (error instanceof GuardError) {
    switch (error.code) {
      case 'NETWORK_MISMATCH':
        return `Switch ${name} to ${chain} and retry.`;
      case 'FEE_EXCEEDS_AMOUNT':
        return 'The amount is too small to cover the network fee. Try a larger amount.';
      case 'QUOTE_MOVED':
        return 'The price moved while you were confirming. Review the new amount and try again.';
      case 'WALLET_NOT_CONNECTED':
      case 'PUBLIC_KEY_MISMATCH':
        return `${name} isn’t available right now. Unlock it and try again.`;
      default:
        break;
    }
  }

  if (
    /chain|network/.test(text) &&
    /switch|mismatch|unsupported|unrecognized/.test(text)
  ) {
    return `Switch ${name} to ${chain} and retry.`;
  }

  if (/too (low|small)|below (the )?minimum|minimum amount/.test(text)) {
    return 'The amount is too small to deposit. Try a larger amount.';
  }

  if (error instanceof ExecutionPollTimeoutError) {
    return 'The deposit is taking longer than usual. It keeps going — check Activity for the result.';
  }

  if (isTransfer) {
    return `The transfer from ${name} didn’t go through. Retry to send it, or cancel the deposit.`;
  }

  const service = describeServiceError(error, account);

  if (service !== error) {
    // Already a plain explanation (service unreachable, named NEAR account).
    return service.message;
  }

  if (error instanceof IntentsConnectApiError) {
    return error.status >= 500
      ? 'Intents Connect is having trouble right now. Try again in a moment.'
      : 'Intents Connect couldn’t prepare this deposit. Try another amount or token.';
  }

  return 'Something went wrong with the deposit. Try again.';
};
