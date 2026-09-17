const BECH32_REGEX = /^ltc1[a-z0-9]{39,59}$/;
const BASE58_REGEX = /^[LM3][a-km-zA-HJ-NP-Z1-9]{26,33}$/;

/**
 * BIP173 allows bech32 addresses to be written entirely in lowercase or
 * entirely in uppercase (the latter is common in QR codes), never mixed.
 */
const isBech32Case = (addr: string) =>
  addr === addr.toLowerCase() || addr === addr.toUpperCase();

export const isLtcAddress = (addr: string) =>
  (isBech32Case(addr) && BECH32_REGEX.test(addr.toLowerCase())) ||
  BASE58_REGEX.test(addr);
