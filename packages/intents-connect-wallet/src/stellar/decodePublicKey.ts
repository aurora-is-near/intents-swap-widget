import { StrKey } from '@stellar/stellar-sdk';
import type { StellarProvider } from '@aurora-is-near/intents-connect';

/**
 * StrKey `G…` → the 32 raw bytes the `sep53` signer needs for its `publicKey`.
 *
 * Injected into the signer from here so `@stellar/stellar-sdk` stays out of the
 * headless core. A `G…` address is NOT raw base58, so it cannot be encoded
 * directly.
 */
export const decodePublicKey = (provider: StellarProvider): Uint8Array => {
  if (!provider.publicKey) {
    throw new Error('No public key found in Stellar provider.');
  }

  return StrKey.decodeEd25519PublicKey(provider.publicKey);
};
