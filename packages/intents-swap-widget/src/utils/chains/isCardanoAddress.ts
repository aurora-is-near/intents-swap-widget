// Shelley-era bech32 addresses (lowercase or, per BIP173, all-uppercase).
const SHELLEY_REGEX = /^(addr1|addr_test1)[a-z0-9]{20,}$/;
// Byron-era base58 addresses are legacy but still valid on mainnet.
const BYRON_REGEX = /^(Ae2|DdzFF)[1-9A-HJ-NP-Za-km-z]{50,120}$/;

const isBech32Case = (addr: string) =>
  addr === addr.toLowerCase() || addr === addr.toUpperCase();

export const isCardanoAddress = (addr: string) =>
  (isBech32Case(addr) && SHELLEY_REGEX.test(addr.toLowerCase())) ||
  BYRON_REGEX.test(addr);
