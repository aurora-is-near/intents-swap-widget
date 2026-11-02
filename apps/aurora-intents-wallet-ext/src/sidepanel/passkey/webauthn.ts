import { base58, base64urlnopad } from '@scure/base';

import type { WebAuthnProvider } from '@aurora-is-near/intents-swap-widget';

/** COSE ES256: ECDSA on P-256 with SHA-256, the curve intents.near verifies. */
const ES256 = -7;

/** DER SubjectPublicKeyInfo of a P-256 key: a fixed 26-byte prefix + 0x04 ‖ x ‖ y. */
const P256_SPKI_LENGTH = 91;

const TIMEOUT_MS = 120_000;

export type Passkey = {
  /** base64url credential ID, used to ask for this exact passkey when signing. */
  credentialId: string;
  /** `p256:<base58 x‖y>`, the format the intents contract expects. */
  publicKey: string;
};

export class PasskeyError extends Error {
  constructor(
    message: string,
    /** The DOMException name (e.g. `NotAllowedError`), when there is one. */
    readonly reason?: string,
  ) {
    super(message);
  }
}

const toPasskeyError = (error: unknown): PasskeyError => {
  if (error instanceof PasskeyError) {
    return error;
  }

  if (error instanceof DOMException) {
    return new PasskeyError(`${error.name}: ${error.message}`, error.name);
  }

  return new PasskeyError(
    error instanceof Error ? error.message : 'Unknown passkey error',
  );
};

const p256PublicKeyFromSpki = (spki: ArrayBuffer): string => {
  const bytes = new Uint8Array(spki);

  if (bytes.length !== P256_SPKI_LENGTH || bytes[26] !== 0x04) {
    throw new PasskeyError('The passkey returned an unsupported public key');
  }

  return `p256:${base58.encode(bytes.slice(27))}`;
};

/**
 * Creates a discoverable passkey for this extension. The RP ID defaults to the
 * calling origin, i.e. the extension ID pinned by the manifest `key`, so the
 * passkey only ever works here.
 */
export const createPasskey = async (name: string): Promise<Passkey> => {
  try {
    const credential = await navigator.credentials.create({
      publicKey: {
        rp: { name: 'Aurora Intents' },
        user: {
          id: crypto.getRandomValues(new Uint8Array(16)),
          name,
          displayName: name,
        },
        // Creation proves nothing on its own here (no attestation is checked),
        // so a random challenge is enough.
        challenge: crypto.getRandomValues(new Uint8Array(32)),
        pubKeyCredParams: [{ type: 'public-key', alg: ES256 }],
        authenticatorSelection: {
          residentKey: 'required',
          userVerification: 'required',
        },
        attestation: 'none',
        timeout: TIMEOUT_MS,
      },
    });

    if (!(credential instanceof PublicKeyCredential)) {
      throw new PasskeyError('No passkey was created');
    }

    const response = credential.response as AuthenticatorAttestationResponse;
    const spki = response.getPublicKey();

    if (response.getPublicKeyAlgorithm() !== ES256 || !spki) {
      throw new PasskeyError('The passkey does not use the P-256 curve');
    }

    return {
      credentialId: base64urlnopad.encode(new Uint8Array(credential.rawId)),
      publicKey: p256PublicKeyFromSpki(spki),
    };
  } catch (error) {
    throw toPasskeyError(error);
  }
};

/** Signs a challenge with one specific passkey; prompts for the device lock. */
const signChallenge = async (
  credentialId: string,
  challenge: Uint8Array,
): Promise<AuthenticatorAssertionResponse> => {
  try {
    const credential = await navigator.credentials.get({
      publicKey: {
        // Copies: WebAuthn takes ArrayBuffer-backed views only.
        challenge: new Uint8Array(challenge),
        allowCredentials: [
          {
            type: 'public-key',
            id: new Uint8Array(base64urlnopad.decode(credentialId)),
          },
        ],
        userVerification: 'required',
        timeout: TIMEOUT_MS,
      },
    });

    if (!(credential instanceof PublicKeyCredential)) {
      throw new PasskeyError('The passkey did not sign');
    }

    return credential.response as AuthenticatorAssertionResponse;
  } catch (error) {
    throw toPasskeyError(error);
  }
};

/** The widget's signer for a passkey account (`providers.webauthn`). */
export const createWebAuthnProvider = (passkey: Passkey): WebAuthnProvider => ({
  publicKey: passkey.publicKey,
  signChallenge: (challenge) => signChallenge(passkey.credentialId, challenge),
});
