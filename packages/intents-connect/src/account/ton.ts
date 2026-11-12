import { base64, hex } from '@scure/base';

const RAW_ADDRESS = /^(-?\d+):([0-9a-f]{64})$/i;
/** User-friendly form: 36 bytes (flags, workchain, hash, CRC16) as base64. */
const FRIENDLY_ADDRESS = /^[A-Za-z0-9+/_-]{48}$/;

/**
 * A TON address in one comparable form, `<workchain>:<hash hex>`, from
 * either the raw (`0:ab…`) or the user-friendly (`EQ…`/`UQ…`) form, or
 * `undefined` for neither. Bounceability and the test flag are dropped:
 * they're how an address is shown, not which account it is.
 *
 * The friendly form's CRC16 is not verified: addresses come from wallets
 * and token lists, not from typing.
 */
export const tonAddressKey = (address: string): string | undefined => {
  const raw = RAW_ADDRESS.exec(address);

  if (raw) {
    return `${Number(raw[1])}:${raw[2].toLowerCase()}`;
  }

  if (!FRIENDLY_ADDRESS.test(address)) {
    return undefined;
  }

  try {
    const bytes = base64.decode(address.replace(/-/g, '+').replace(/_/g, '/'));
    const workchain = bytes[1] > 127 ? bytes[1] - 256 : bytes[1];

    return `${workchain}:${hex.encode(bytes.slice(2, 34))}`;
  } catch {
    return undefined;
  }
};
