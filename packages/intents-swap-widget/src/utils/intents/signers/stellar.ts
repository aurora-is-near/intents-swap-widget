import { utils } from '@defuse-protocol/internal-utils';
import { createIntentSignerViem } from '@defuse-protocol/intents-sdk';
import { StrKey } from '@stellar/stellar-sdk';
import bs58 from 'bs58';
import { StellarProvider } from '../../../types/providers';

type SignIntentResult = ReturnType<
  ReturnType<typeof createIntentSignerViem>['signIntent']
>;
type SignIntentPayload = Parameters<
  ReturnType<typeof createIntentSignerViem>['signIntent']
>[0];

function transformStellarSignature(signature: string) {
  return `ed25519:${bs58.encode(Buffer.from(signature, 'base64'))}`;
}

export class IntentSignerStellar
  implements ReturnType<typeof createIntentSignerViem>
{
  constructor(
    private account: { walletAddress: string },
    private stellarWallet: StellarProvider,
  ) {}

  async signIntent(intent: SignIntentPayload): SignIntentResult {
    const message = JSON.stringify({
      verifying_contract: intent.verifying_contract,
      deadline: intent.deadline,
      nonce: intent.nonce,
      intents: intent.intents,
      signer_id:
        intent.signer_id ??
        utils.authHandleToIntentsUserId({
          identifier: this.account.walletAddress,
          method: 'stellar',
        }),
    });

    const { signedMessage } = await this.stellarWallet.signMessage(message);

    return {
      payload: message,
      public_key: `ed25519:${bs58.encode(StrKey.decodeEd25519PublicKey(this.account.walletAddress))}`,
      standard: 'sep53',
      signature: transformStellarSignature(signedMessage),
    };
  }
}
