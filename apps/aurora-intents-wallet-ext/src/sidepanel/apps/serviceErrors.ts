import type { WalletFamily } from '../wallet/types';

/**
 * `fetch` rejects with a bare TypeError ("Failed to fetch") both when the
 * network is down and when the service answers an error page without CORS
 * headers (e.g. a 502) — the browser hides the response either way.
 */
const isUnreadableResponse = (error: unknown) =>
  error instanceof TypeError && /fetch/i.test(error.message);

// Implicit NEAR accounts are 64 hex chars; anything else is a named account.
const isNamedNearAccount = (family: WalletFamily, address: string) =>
  family === 'near' && !/^[0-9a-f]{64}$/.test(address);

/**
 * Turns an unreadable Intents Connect API failure into something a user can
 * act on. Other errors pass through unchanged.
 */
export const describeServiceError = (
  error: Error,
  wallet: { family: WalletFamily; address: string } | null,
): Error => {
  if (!isUnreadableResponse(error) && !isUnreadableResponse(error.cause)) {
    return error;
  }

  if (wallet && isNamedNearAccount(wallet.family, wallet.address)) {
    return new Error(
      `Intents Connect can't resolve named NEAR accounts like ${wallet.address} yet — the service returns an error. Implicit (64-character) NEAR accounts work.`,
      { cause: error },
    );
  }

  return new Error(
    "Couldn't reach Intents Connect — the service returned an error or is unreachable. Try again in a moment.",
    { cause: error },
  );
};
