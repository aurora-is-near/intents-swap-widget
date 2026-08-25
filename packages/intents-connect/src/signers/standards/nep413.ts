import type { NearWalletBase } from '@/types/providers';
import type { SignatureEnvelope } from '@/types/signing';
import {
  ed25519Signature,
  fromBase64,
  toBase58,
} from '@/signers/standards/encoding';

export type Nep413Payload = {
  message: string;
  /** Base64-encoded 32 bytes. */
  nonce: string;
  recipient: string;
  callbackUrl?: string | null;
};

export type Nep413SignArgs = {
  payload: Nep413Payload;
  getProvider: () => NearWalletBase;
  /** The NEAR account the execution is bound to. */
  expectedAccountId: string;
};

/**
 * NEP-413. The wallet builds the prefix tag, borsh-encodes and SHA-256 hashes
 * internally — do not pre-hash, do not pre-borsh, do not wrap the message.
 */
export const signNep413 = async ({
  payload,
  getProvider,
  expectedAccountId,
}: Nep413SignArgs): Promise<SignatureEnvelope> => {
  const wallet = getProvider();

  if (!wallet.signMessage) {
    throw new Error('NEAR wallet does not expose signMessage');
  }

  // The nonce must reach the wallet as 32 raw bytes. Passing the base64 string
  // makes the borsh-encoded payload diverge from what the backend verifies.
  const nonce = fromBase64(payload.nonce);

  // Only the NEP-413 trio. `callbackUrl` is borsh-encoded as Option<String>,
  // so forwarding it would change the signed digest byte-for-byte — the
  // backend verifies against {message, recipient, nonce} alone.
  const signed = await wallet.signMessage({
    message: payload.message,
    recipient: payload.recipient,
    nonce,
  });

  if (!signed) {
    throw new Error('NEAR wallet failed to sign the message');
  }

  if (signed.accountId !== expectedAccountId) {
    throw new Error('Connected NEAR account does not match the execution');
  }

  const publicKey = signed.publicKey.startsWith('ed25519:')
    ? signed.publicKey
    : `ed25519:${signed.publicKey}`;

  // NEP-413 wallets return base64; the verifier wants ed25519:<base58>.
  // Wallets disagree about whether they already applied the prefix — and some
  // return raw bytes instead of a string.
  const rawSignature = signed.signature as string | Uint8Array;

  let signature: string;

  if (typeof rawSignature !== 'string') {
    signature = ed25519Signature(rawSignature);
  } else if (rawSignature.startsWith('ed25519:')) {
    signature = rawSignature;
  } else {
    signature = ed25519Signature(fromBase64(rawSignature));
  }

  return { signature, publicKey };
};

/** Exported for adapters that need to re-encode a raw key. */
export const encodePublicKey = (bytes: Uint8Array): string =>
  `ed25519:${toBase58(bytes)}`;
