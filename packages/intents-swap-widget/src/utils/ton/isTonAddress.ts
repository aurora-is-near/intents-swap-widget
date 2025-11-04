import { Address } from '@ton/core';

export const isTonAddress = (addr: string): boolean => {
  try {
    Address.parse(addr);
  } catch {
    return false;
  }

  return true;
};
