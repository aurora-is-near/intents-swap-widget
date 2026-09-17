import { Address } from '@ton/core';

export const isTonAddress = (addr: string): boolean => {
  try {
    if (Address.isFriendly(addr)) {
      // Reject addresses carrying the testnet-only flag.
      return !Address.parseFriendly(addr).isTestOnly;
    }

    return Address.isRaw(addr);
  } catch {
    return false;
  }
};
