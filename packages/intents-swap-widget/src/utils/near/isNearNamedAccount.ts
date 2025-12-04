/**
 * Check if an address is a NEAR named account (e.g., "alice.near", "app.factory.near").
 * Does NOT include implicit accounts (64-char hex).
 */
export const isNearNamedAccount = (address?: string | null): boolean => {
  if (!address) {
    return false;
  }

  return (
    /^[a-z0-9_-]+(\.[a-z0-9_-]+)*\.near$/i.test(address) ||
    /^[a-z0-9_-]+(\.[a-z0-9_-]+)*\.testnet$/i.test(address)
  );
};
