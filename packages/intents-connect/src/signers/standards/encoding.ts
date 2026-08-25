import { base58, base64 } from '@scure/base';

/**
 * Wire encodings the NEAR intents verifier expects.
 *
 * These are the rules that cost the most time to rediscover, so they live in
 * exactly one place: base58 (never base64) on the wire, a `secp256k1:` or
 * `ed25519:` prefix, and a recovery byte normalised to 0/1.
 */

const SIGNATURE_BYTE_LENGTH_ED25519 = 64;
const SIGNATURE_BYTE_LENGTH_SECP256K1 = 65;
const RECOVERY_BYTE_INDEX = 64;

export const fromBase64 = (value: string): Uint8Array => base64.decode(value);

export const toBase64 = (bytes: Uint8Array): string => base64.encode(bytes);

export const toBase58 = (bytes: Uint8Array): string => base58.encode(bytes);

export const fromHex = (value: string): Uint8Array => {
  const normalised = value.replace(/^0x/i, '').toLowerCase();

  if (normalised.length % 2 !== 0) {
    throw new Error('Hex string has an odd length');
  }

  // Without this, `Number.parseInt('zz', 16)` yields NaN, which a Uint8Array
  // stores as 0 — turning a malformed wallet signature into a well-formed
  // all-zero one that only fails later, server-side, with an opaque message.
  if (!/^[0-9a-f]*$/.test(normalised)) {
    throw new Error('Hex string contains non-hexadecimal characters');
  }

  const bytes = new Uint8Array(normalised.length / 2);

  for (let i = 0; i < bytes.length; i += 1) {
    bytes[i] = Number.parseInt(normalised.slice(i * 2, i * 2 + 2), 16);
  }

  return bytes;
};

/**
 * `personal_sign` / TIP-191 return `v` as 27 or 28; the verifier wants 0 or 1.
 * Only byte 64 is touched — `r` and `s` are left alone.
 */
export const normaliseRecoveryByte = (signature: Uint8Array): Uint8Array => {
  if (signature.length !== SIGNATURE_BYTE_LENGTH_SECP256K1) {
    throw new Error(
      `secp256k1 signature must be ${SIGNATURE_BYTE_LENGTH_SECP256K1} bytes, got ${signature.length}`,
    );
  }

  const normalised = Uint8Array.from(signature);
  const recovery = normalised[RECOVERY_BYTE_INDEX];

  if (recovery >= 27) {
    normalised[RECOVERY_BYTE_INDEX] = recovery - 27;
  }

  return normalised;
};

export const assertEd25519SignatureLength = (
  signature: Uint8Array,
  label: string,
): Uint8Array => {
  if (signature.length !== SIGNATURE_BYTE_LENGTH_ED25519) {
    throw new Error(
      `${label} signature must be ${SIGNATURE_BYTE_LENGTH_ED25519} bytes, got ${signature.length}`,
    );
  }

  return signature;
};

export const secp256k1Signature = (bytes: Uint8Array): string =>
  `secp256k1:${toBase58(bytes)}`;

export const ed25519Signature = (bytes: Uint8Array): string =>
  `ed25519:${toBase58(bytes)}`;

export const ed25519PublicKeyFromBytes = (bytes: Uint8Array): string =>
  `ed25519:${toBase58(bytes)}`;

/** Solana addresses are already the base58 public key. */
export const ed25519PublicKeyFromBase58 = (value: string): string =>
  value.startsWith('ed25519:') ? value : `ed25519:${value}`;
