import { base58 } from '@scure/base';

/** A mainnet address is `0x41` and 20 bytes, then a 4-byte checksum. */
const MAINNET_PREFIX = 0x41;
const DECODED_LENGTH = 25;

/**
 * The 20 address bytes a TRON base58 address (`T…`) encodes, or `undefined`
 * for anything that isn't shaped like one.
 *
 * The checksum (double SHA-256) is not verified: that needs a hash this
 * package doesn't carry, and addresses come from the wallet, not from typing.
 */
export const decodeTronAddress = (address: string): Uint8Array | undefined => {
  try {
    const bytes = base58.decode(address);

    return bytes.length === DECODED_LENGTH && bytes[0] === MAINNET_PREFIX
      ? bytes.slice(1, 21)
      : undefined;
  } catch {
    return undefined;
  }
};
