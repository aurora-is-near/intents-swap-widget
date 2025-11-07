export const isNearAddress = (address?: string | null): boolean => {
  if (!address) {
    return false;
  }

  // Implicit account (64-character hex)
  if (/^[0-9a-f]{64}$/i.test(address)) {
    return true;
  }

  // Named accounts like "alice.near" or "myapp.factory.sub.near"
  if (
    /^[a-z0-9_-]+(\.[a-z0-9_-]+)*\.near$/i.test(address) ||
    /^[a-z0-9_-]+(\.[a-z0-9_-]+)*\.testnet$/i.test(address)
  ) {
    return true;
  }

  return false;
};
