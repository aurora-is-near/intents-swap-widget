/* eslint-disable no-bitwise -- CRC16 and StrKey bytes are bit arithmetic. */
import { base32 } from '@scure/base';

/** StrKey version byte of an account id (`G…`): 6 << 3. */
const ACCOUNT_VERSION = 0x30;

/** CRC16-XModem, as StrKey checksums it (little-endian on the wire). */
const crc16 = (bytes: Uint8Array): number => {
  let crc = 0;

  bytes.forEach((byte) => {
    crc ^= byte << 8;

    for (let bit = 0; bit < 8; bit += 1) {
      crc = crc & 0x8000 ? ((crc << 1) ^ 0x1021) & 0xffff : (crc << 1) & 0xffff;
    }
  });

  return crc;
};

/**
 * The 32-byte ed25519 public key a Stellar account id (`G…`) encodes, or
 * `undefined` for anything that isn't a well-formed one. Its hex is the
 * account's intents id. No `@stellar/stellar-sdk` needed.
 */
export const decodeStellarAccount = (
  address: string,
): Uint8Array | undefined => {
  try {
    if (address.length !== 56) {
      return undefined;
    }

    const decoded = base32.decode(address);
    const payload = decoded.slice(0, -2);
    const checksum = crc16(payload);

    const valid =
      decoded[33] === (checksum & 0xff) && decoded[34] === checksum >> 8;

    return payload[0] === ACCOUNT_VERSION && valid
      ? payload.slice(1)
      : undefined;
  } catch {
    return undefined;
  }
};
