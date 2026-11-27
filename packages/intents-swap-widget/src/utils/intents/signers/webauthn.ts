import { p256 } from '@noble/curves/p256';
import { base58 } from '@scure/base';
import {
  authIdentity,
  messageFactory,
  prepareBroadcastRequest,
} from '@defuse-protocol/internal-utils';

import { WidgetError } from '@/errors';
import type { PreparedIntent, SignedIntent } from '@/types/intents';
import type { WebAuthnProvider } from '@/types/providers';

import type { PreparedIntentSigner } from './types';

/** A DER P-256 signature as raw r‖s (low-S), always 64 bytes. */
const toRawP256Signature = (der: ArrayBuffer) =>
  p256.Signature.fromDER(new Uint8Array(der)).normalizeS().toCompactRawBytes();

export class IntentSignerWebAuthn implements PreparedIntentSigner {
  readonly standard = 'webauthn' as const;

  constructor(
    private account: { walletAddress: string },
    private passkey: WebAuthnProvider,
  ) {}

  async signIntent(intent: PreparedIntent): Promise<SignedIntent> {
    if (intent.standard !== this.standard) {
      throw new WidgetError(
        `Passkey signer cannot sign ${intent.standard} payload`,
      );
    }

    const accountId = authIdentity.authHandleToIntentsUserId(
      this.passkey.publicKey,
      'webauthn',
    );

    if (accountId !== this.account.walletAddress.toLowerCase()) {
      throw new WidgetError('Passkey does not match the widget account');
    }

    // The contract recomputes sha256(payload) and checks it against the
    // challenge in client_data_json.
    const challenge = messageFactory.makeChallenge(
      new TextEncoder().encode(intent.payload),
    );

    const signatureData = await this.passkey.signChallenge(challenge);

    // Encodes the payload, public key, client data and authenticator data
    // for the contract, with the signature as raw r‖s (low-S).
    const signed = prepareBroadcastRequest.prepareSwapSignedData(
      {
        type: 'WEBAUTHN',
        signatureData,
        signedData: {
          challenge,
          payload: intent.payload,
          parsedPayload: JSON.parse(intent.payload),
        },
      },
      { userAddress: this.passkey.publicKey, userChainType: 'webauthn' },
    ) as SignedIntent;

    if (!this.passkey.publicKey.startsWith('p256:')) {
      return signed;
    }

    // The SDK (`extractRawSignature`) drops the leading zero bytes of a short
    // r or s, about 1 signature in 128, which the contract then rejects:
    // re-encode r and s at a fixed 32 bytes each.
    return {
      ...signed,
      signature: `p256:${base58.encode(toRawP256Signature(signatureData.signature))}`,
    };
  }
}
