const BECH32_REGEX = /^bc1[a-z0-9]{25,62}$/;
const BASE58_REGEX = /^[13][a-km-zA-HJ-NP-Z1-9]{25,34}$/;

/**
 * BIP173 allows bech32 addresses to be written entirely in lowercase or
 * entirely in uppercase (the latter is common in QR codes), never mixed.
 */
const isBech32Case = (addr: string) =>
  addr === addr.toLowerCase() || addr === addr.toUpperCase();

export const isBtcAddress = (addr: string) =>
  (isBech32Case(addr) && BECH32_REGEX.test(addr.toLowerCase())) ||
  BASE58_REGEX.test(addr);
