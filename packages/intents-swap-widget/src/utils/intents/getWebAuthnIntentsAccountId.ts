import { authIdentity } from '@defuse-protocol/internal-utils';

/**
 * Intents account ID of a passkey. For P-256 it's `0x` + the last 20 bytes of
 * keccak256("p256" ‖ x ‖ y): shaped like an EVM address, but not one — no
 * private key exists for it on any chain.
 *
 * @param publicKey `p256:<base58 x‖y>` or `ed25519:<base58>`
 */
export const getWebAuthnIntentsAccountId = (publicKey: string): string =>
  authIdentity.authHandleToIntentsUserId(publicKey, 'webauthn');
