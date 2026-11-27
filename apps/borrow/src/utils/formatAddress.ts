const HEAD = 6;
const TAIL = 4;

/** The longest named NEAR account shown whole, such as `maksim-borrow.near`. */
const NAMED_MAX = 24;

/** The name characters kept when a named account is too long to show whole. */
const NAMED_HEAD = 16;

/**
 * Shortens a wallet address to its first 6 and last 4 characters, as the
 * header's wallet button shows it: `0x7a3f…9c21`. An address too short to
 * shorten is returned as it is.
 *
 * A named NEAR account (`alice.near`) reads as a name, so it stays whole up
 * to 24 characters; a longer one keeps its start and its suffix
 * (`a-very-long-acco….near`).
 */
export function formatAddress(address: string): string {
  const dot = address.lastIndexOf('.');

  if (dot > 0) {
    return address.length <= NAMED_MAX
      ? address
      : `${address.slice(0, NAMED_HEAD)}…${address.slice(dot)}`;
  }

  if (address.length <= HEAD + TAIL + 1) {
    return address;
  }

  return `${address.slice(0, HEAD)}…${address.slice(-TAIL)}`;
}
