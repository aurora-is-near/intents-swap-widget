import { isNearNamedAccount } from './isNearNamedAccount';

export const isNearAddress = (address?: string | null): boolean => {
  if (!address) {
    return false;
  }

  // Implicit account (64-character hex)
  if (/^[0-9a-f]{64}$/i.test(address)) {
    return true;
  }

  return isNearNamedAccount(address);
};
