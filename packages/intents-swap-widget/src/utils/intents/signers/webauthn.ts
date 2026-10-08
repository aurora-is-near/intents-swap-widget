import {
  authIdentity,
  messageFactory,
  prepareBroadcastRequest,
} from '@defuse-protocol/internal-utils';

import { WidgetError } from '@/errors';
import type { PreparedIntent, SignedIntent } from '@/types/intents';
import type { WebAuthnProvider } from '@/types/providers';

import type { PreparedIntentSigner } from './types';

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

    // Converts the DER signature to raw r‖s (low-S) and encodes the payload,
    // public key, client data and authenticator data for the contract.
    return prepareBroadcastRequest.prepareSwapSignedData(
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
  }
}
