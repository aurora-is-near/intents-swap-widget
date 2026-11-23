const IMPLICIT_ACCOUNT_REGEX = /^(0x[0-9a-f]{40}|[0-9a-f]{64})$/;

/**
 * Whether the address is a NEAR implicit account
 *
 * Either ETH-style (NEP-518) or ed25519 (64-char hex). Implicit accounts come
 * into existence with the first transfer they receive, so not finding one
 * on-chain is expected.
 *
 * NEAR account IDs are lowercase, so mixed-case addresses don't match: use
 * `normaliseNearImplicitAccount` first for user input.
 */
export const isNearImplicitAccount = (
  address: string | undefined | null,
): boolean => !!address && IMPLICIT_ACCOUNT_REGEX.test(address);

/**
 * Lowercases an implicit account address pasted in another case.
 *
 * Such as a checksummed `0x…` address copied from an EVM wallet. Other
 * addresses are returned unchanged.
 */
export const normaliseNearImplicitAccount = (address: string): string => {
  const lowercased = address.toLowerCase();

  return isNearImplicitAccount(lowercased) ? lowercased : address;
};

/**
 * Whether two send addresses name the same recipient, treating implicit
 * accounts case-insensitively, since the widget stores them lowercased.
 */
export const isSameSendAddress = (
  a: string | undefined | null,
  b: string | undefined | null,
): boolean =>
  a === b ||
  (!!a &&
    !!b &&
    normaliseNearImplicitAccount(a) === normaliseNearImplicitAccount(b));
