import { toError } from '@/errors';
import type { StellarProvider } from '@/types/providers';
import type { SignatureEnvelope } from '@/types/signing';
import {
  assertEd25519SignatureLength,
  ed25519PublicKeyFromBytes,
  ed25519Signature,
  fromBase64,
} from '@/signers/standards/encoding';

export type Sep53SignArgs = {
  /** Signed verbatim, like erc191. */
  message: string;
  provider: StellarProvider;
  /** The `G…` StrKey address the execution is bound to. */
  expectedAddress: string;
  /**
   * StrKey `G…` → 32 raw bytes.
   *
   * Injected rather than implemented here so `@stellar/stellar-sdk` stays out
   * of this package — the same indirection the widget's `StellarNetworkPlugin`
   * uses. A `G…` string is NOT raw base58, so it cannot be encoded directly.
   */
  decodePublicKey: () => Uint8Array;
};

/**
 * SEP-53. Freighter applies the `"Stellar Signed Message:\n"` prefix and
 * SHA-256 internally — do not pre-hash and do not wrap.
 */
export const signSep53 = async ({
  message,
  provider,
  expectedAddress,
  decodePublicKey,
}: Sep53SignArgs): Promise<SignatureEnvelope> => {
  const result = await provider.signMessage(message);

  // Freighter reports failures IN-BAND rather than rejecting: a user
  // rejection arrives as `{ error }` with no signedMessage, and destructuring
  // it blindly turns a clean rejection into an opaque decoding crash.
  // Rethrown through toError so the original value survives on `cause` —
  // isUserRejection reads the rejection code from there.
  const inBandError = (result as { error?: { message?: string } | string })
    ?.error;

  if (inBandError) {
    throw toError(inBandError);
  }

  const { signedMessage, signerAddress } = result;

  if (!signedMessage) {
    throw new Error('Stellar wallet returned no signed message');
  }

  if (signerAddress && signerAddress !== expectedAddress) {
    throw new Error('Connected Stellar account does not match the execution');
  }

  // Freighter versions disagree: base64 string or Uint8Array.
  const signature =
    signedMessage instanceof Uint8Array
      ? signedMessage
      : fromBase64(signedMessage);

  return {
    signature: ed25519Signature(
      assertEd25519SignatureLength(signature, 'SEP-53'),
    ),
    publicKey: ed25519PublicKeyFromBytes(decodePublicKey()),
  };
};
