import { base64 } from '@scure/base';

/**
 * `intents.near` versioned, expirable nonces — a port of
 * `@defuse-protocol/intents-sdk`'s `VersionedNonceBuilder`, without borsh or
 * near-api-js.
 *
 * Layout (32 bytes, base64 on the wire):
 *
 *   magic[4] ‖ version u8 ‖ salt[4] ‖ deadline u64 LE (ns) ‖ inner[15]
 *
 * `inner` is `createTimestampedNonceBytes(now)`: the creation time as u64 LE
 * nanoseconds, then 7 random bytes. 1Click's user-auth endpoint reads that
 * timestamp and rejects a nonce more than 5 minutes off; a fully random
 * `inner` is rejected as "invalid nonce".
 */

const MAGIC = [0x56, 0x28, 0xf6, 0xc6] as const;
const VERSION = 0;
const SALT_LENGTH = 4;
const INNER_LENGTH = 15;
const NONCE_LENGTH = 32;

const NS_PER_MS = 1_000_000n;

const toNs = (date: Date): bigint => BigInt(date.getTime()) * NS_PER_MS;

/** Creation time (u64 LE ns) followed by 7 random bytes. */
export const createTimestampedNonceBytes = (startTime: Date): Uint8Array => {
  const bytes = new Uint8Array(INNER_LENGTH);

  new DataView(bytes.buffer).setBigUint64(0, toNs(startTime), true);
  crypto.getRandomValues(bytes.subarray(8));

  return bytes;
};

export const encodeNonce = (
  salt: Uint8Array,
  deadline: Date,
  inner: Uint8Array,
): string => {
  if (salt.length !== SALT_LENGTH) {
    throw new Error(`nonce salt must be ${SALT_LENGTH} bytes`);
  }

  if (inner.length !== INNER_LENGTH) {
    throw new Error(`nonce inner bytes must be ${INNER_LENGTH} bytes`);
  }

  const bytes = new Uint8Array(NONCE_LENGTH);
  const view = new DataView(bytes.buffer);

  bytes.set(MAGIC, 0);
  bytes[4] = VERSION;
  bytes.set(salt, 5);
  view.setBigUint64(9, toNs(deadline), true);
  bytes.set(inner, 17);

  return base64.encode(bytes);
};

export type DecodedNonce = {
  version: number;
  salt: Uint8Array;
  /** Nanoseconds since the epoch. */
  deadlineNs: bigint;
  /** The 15 bytes after the deadline. */
  inner: Uint8Array;
  /** Read from `inner` — only meaningful for a timestamped nonce. */
  startTimeNs: bigint;
};

export const decodeNonce = (encoded: string): DecodedNonce => {
  const bytes = base64.decode(encoded);

  if (bytes.length !== NONCE_LENGTH) {
    throw new Error(`nonce must be ${NONCE_LENGTH} bytes`);
  }

  if (!MAGIC.every((byte, index) => bytes[index] === byte)) {
    throw new Error('not a versioned nonce (bad magic prefix)');
  }

  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);

  return {
    version: bytes[4],
    salt: bytes.slice(5, 9),
    deadlineNs: view.getBigUint64(9, true),
    inner: bytes.slice(17),
    startTimeNs: view.getBigUint64(17, true),
  };
};
