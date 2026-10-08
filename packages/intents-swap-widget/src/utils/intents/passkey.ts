import type { WebAuthnProvider } from '@/types/providers';

import {
  verifyWalletSignature,
  walletVerificationMessageFactory,
} from './walletCompatibilityVerification';

/**
 * Signs an empty intent with the passkey and simulates it on `intents.near`,
 * so a passing check means the contract accepts this passkey's signatures for
 * its account. Moves no funds.
 */
export const verifyPasskey = async (
  passkey: WebAuthnProvider,
): Promise<boolean> => {
  const msg = walletVerificationMessageFactory(passkey.publicKey, 'webauthn');
  const signatureData = await passkey.signChallenge(msg.WEBAUTHN.challenge);

  return verifyWalletSignature(
    { type: 'WEBAUTHN', signatureData, signedData: msg.WEBAUTHN },
    passkey.publicKey,
    'webauthn',
  );
};
