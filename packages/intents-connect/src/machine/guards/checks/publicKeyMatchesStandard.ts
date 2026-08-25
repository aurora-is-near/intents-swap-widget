import { failGuard } from '@/errors';
import { ED25519_STANDARDS, type SigningStandard } from '@/types/signing';

/**
 * ed25519 cannot recover a public key from a signature, so the verifier needs
 * one. secp256k1 can (`ecrecover`), so sending one is rejected. Enforcing the
 * asymmetry here turns a confusing 400 into a local error.
 */
export const publicKeyMatchesStandard = (
  standard: SigningStandard,
  publicKey?: string,
) => {
  const requiresPublicKey = ED25519_STANDARDS.includes(standard);

  if (requiresPublicKey && !publicKey) {
    failGuard(
      'PUBLIC_KEY_MISMATCH',
      `${standard} requires a publicKey — ed25519 keys are not recoverable from a signature`,
    );
  }

  if (!requiresPublicKey && publicKey) {
    failGuard(
      'PUBLIC_KEY_MISMATCH',
      `${standard} must omit publicKey — the signer is recovered via ecrecover`,
    );
  }
};
