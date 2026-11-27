import { Buffer } from 'buffer';

/**
 * A Stellar wallet's `signMessage` signature as bytes. Freighter versions
 * disagree on its shape: a base64 string or the raw bytes.
 */
export const stellarSignatureToBytes = (
  signature: string | Uint8Array,
): Uint8Array =>
  signature instanceof Uint8Array
    ? signature
    : new Uint8Array(Buffer.from(signature, 'base64'));
