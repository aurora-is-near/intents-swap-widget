const HEAD = 6;
const TAIL = 4;

/**
 * Shortens a wallet address to its first 6 and last 4 characters, as the
 * header's wallet button shows it: `0x7a3f…9c21`. An address too short to
 * shorten is returned as it is.
 */
export function formatAddress(address: string): string {
  if (address.length <= HEAD + TAIL + 1) {
    return address;
  }

  return `${address.slice(0, HEAD)}…${address.slice(-TAIL)}`;
}
