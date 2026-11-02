import { FundingError } from '@/funding/errors';
import type {
  IntentsRail,
  PreparedIntent,
  PreparedIntentStandard,
  SignedIntent,
} from '@/intentsApi/types';
import type { NearRpcOptions } from '@/near/rpc';
import { OwnershipError } from '@/ownership/errors';
import {
  type MultiPayloadInput,
  signMultiPayload,
} from '@/ownership/signMultiPayload';
import { IMPLICIT_NEAR_ACCOUNT, isNearKeyRegistered } from '@/ownership/verify';
import type { WalletConnector } from '@/types/wallet';

const mismatch = (message: string) =>
  new FundingError('PAYLOAD_MISMATCH', message);

const isNep413Payload = (
  value: unknown,
): value is Extract<PreparedIntent, { standard: 'nep413' }>['payload'] => {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const payload = value as Record<string, unknown>;

  return (
    typeof payload.message === 'string' &&
    typeof payload.nonce === 'string' &&
    typeof payload.recipient === 'string' &&
    (payload.callbackUrl == null || typeof payload.callbackUrl === 'string')
  );
};

/** The standards this package signs 1Click-prepared intents with. */
export type SignableIntentStandard = 'erc191' | 'raw_ed25519' | 'nep413';

/** The wallet's standard, or `UNSUPPORTED_STANDARD` before anything is quoted. */
export const requireSignableStandard = (
  wallet: Pick<WalletConnector, 'signingStandard'>,
): SignableIntentStandard => {
  const { signingStandard } = wallet;

  if (
    signingStandard === 'erc191' ||
    signingStandard === 'raw_ed25519' ||
    signingStandard === 'nep413'
  ) {
    return signingStandard;
  }

  throw new FundingError(
    'UNSUPPORTED_STANDARD',
    `funding from intents is not supported for ${signingStandard} wallets yet`,
  );
};

/** Throws unless 1Click returned a payload of the wallet's standard. */
export function assertPreparedIntent(
  intent: unknown,
  standard: PreparedIntentStandard,
): asserts intent is PreparedIntent {
  if (!intent || typeof intent !== 'object' || !('standard' in intent)) {
    throw mismatch('1Click returned no intent to sign');
  }

  const prepared = intent as PreparedIntent;

  if (prepared.standard !== standard) {
    throw mismatch(
      `1Click returned a ${prepared.standard} intent for a ${standard} wallet`,
    );
  }

  const valid =
    prepared.standard === 'nep413'
      ? isNep413Payload(prepared.payload)
      : typeof prepared.payload === 'string';

  if (!valid) {
    throw mismatch(`1Click returned an invalid ${prepared.standard} intent`);
  }
}

/** What the transfer funding a quote must be. */
export type SwapTransferExpectation = {
  /** The intents account that signs and pays. */
  signerId: string;
  /** The quote's deposit address. */
  depositAddress: string;
  tokenId: string;
  /** Smallest unit. */
  amount: string;
  rail: IntentsRail;
};

type TransferIntent = {
  intent?: unknown;
  receiver_id?: unknown;
  tokens?: unknown;
};

/**
 * Throws unless the intent moves exactly `amount` of `tokenId` from
 * `signerId` to the deposit address, and nothing else — checked before the
 * wallet prompt, so a wrong payload is never signed.
 *
 * On the confidential rail the intent's shape is not pinned down yet: the
 * signer is checked, and the receiver of any transfer.
 */
export const assertSwapTransferPayload = (
  prepared: PreparedIntent,
  expected: SwapTransferExpectation,
) => {
  let parsed: unknown;

  try {
    parsed = JSON.parse(
      prepared.standard === 'nep413'
        ? prepared.payload.message
        : prepared.payload,
    );
  } catch {
    throw mismatch('the intent to sign is not JSON');
  }

  const { signer_id: signerId, intents } = (parsed ?? {}) as {
    signer_id?: unknown;
    intents?: unknown;
  };

  if (signerId !== expected.signerId) {
    throw mismatch(
      `the intent is signed by ${String(signerId)}, not ${expected.signerId}`,
    );
  }

  const list = Array.isArray(intents) ? (intents as TransferIntent[]) : [];
  const transfers = list.filter((entry) => entry?.intent === 'transfer');

  if (
    transfers.some((entry) => entry.receiver_id !== expected.depositAddress)
  ) {
    throw mismatch('the transfer does not go to the quote deposit address');
  }

  if (expected.rail === 'CONFIDENTIAL_INTENTS') {
    return;
  }

  if (list.length !== 1 || transfers.length !== 1) {
    throw mismatch('the intent must be exactly one transfer');
  }

  const tokens = transfers[0].tokens as Record<string, unknown> | undefined;

  if (
    !tokens ||
    Object.keys(tokens).length !== 1 ||
    String(tokens[expected.tokenId]) !== expected.amount
  ) {
    throw mismatch(
      `the transfer must move exactly ${expected.amount} of ${expected.tokenId}`,
    );
  }
};

const toFundingError = (error: unknown): unknown =>
  error instanceof OwnershipError
    ? new FundingError(error.code, error.message, { cause: error.cause })
    : error;

const requireRegisteredKey = async (
  accountId: string,
  publicKey: string,
  rpc: NearRpcOptions,
) => {
  if ((await isNearKeyRegistered(accountId, publicKey, rpc)) === false) {
    throw new FundingError(
      'PUBLIC_KEY_NOT_REGISTERED',
      `${publicKey} is not registered for ${accountId} on intents.near`,
    );
  }
};

export type SignPreparedIntentOptions = NearRpcOptions & {
  /** Checked before the wallet prompt — see `assertSwapTransferPayload`. */
  expect?: SwapTransferExpectation;
};

/**
 * Has the wallet sign an intent 1Click prepared (`generateIntent`) — one
 * wallet prompt — and returns the `MultiPayload` for `submitIntent`.
 *
 * - erc191 signs the payload string verbatim; raw_ed25519 its UTF-8 bytes;
 *   nep413 the NEP-413 message (a `callbackUrl` is refused: it cannot be
 *   passed through to the wallet, so the signature would not match).
 * - A named NEAR account must have the key registered with `intents.near`;
 *   checked before the prompt and against the key that signed.
 * - sep53 / webauthn are refused as `UNSUPPORTED_STANDARD`.
 */
export const signPreparedIntent = async (
  wallet: Pick<
    WalletConnector,
    'signingStandard' | 'getAddress' | 'getProviders' | 'getPublicKey'
  >,
  prepared: PreparedIntent,
  { expect, ...rpc }: SignPreparedIntentOptions = {},
): Promise<SignedIntent> => {
  let input: MultiPayloadInput;

  switch (prepared.standard) {
    case 'erc191':
    case 'raw_ed25519':
      input = { standard: prepared.standard, payload: prepared.payload };
      break;

    case 'nep413': {
      const { message, nonce, recipient, callbackUrl } = prepared.payload;

      if (callbackUrl) {
        throw mismatch('a NEP-413 intent with a callbackUrl cannot be signed');
      }

      input = { standard: 'nep413', payload: { message, nonce, recipient } };
      break;
    }

    default:
      throw new FundingError(
        'UNSUPPORTED_STANDARD',
        `intents signed with ${prepared.standard} are not supported`,
      );
  }

  if (prepared.standard !== wallet.signingStandard) {
    throw mismatch(
      `a ${prepared.standard} intent cannot be signed by a ${wallet.signingStandard} wallet`,
    );
  }

  if (expect) {
    assertSwapTransferPayload(prepared, expect);
  }

  const address = wallet.getAddress();

  if (!address) {
    throw new FundingError(
      'WALLET_NOT_CONNECTED',
      'the wallet has not shared an address',
    );
  }

  const namedNear =
    prepared.standard === 'nep413' && !IMPLICIT_NEAR_ACCOUNT.test(address);

  const knownKey = wallet.getPublicKey?.();

  if (namedNear && knownKey) {
    await requireRegisteredKey(address, knownKey, rpc);
  }

  let signed: SignedIntent;

  try {
    signed = await signMultiPayload(wallet, input);
  } catch (error) {
    throw toFundingError(error);
  }

  if (
    namedNear &&
    signed.standard === 'nep413' &&
    signed.public_key !== knownKey
  ) {
    await requireRegisteredKey(address, signed.public_key, rpc);
  }

  return signed;
};
