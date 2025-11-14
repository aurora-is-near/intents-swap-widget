import { utils } from '@defuse-protocol/internal-utils';
import { createIntentSignerViem } from '@defuse-protocol/bridge-sdk';
import bs58 from 'bs58';
import { SolanaProvider } from '../../../types/providers';

type SignIntentResult = ReturnType<
  ReturnType<typeof createIntentSignerViem>['signIntent']
>;
type SignIntentPayload = Parameters<
  ReturnType<typeof createIntentSignerViem>['signIntent']
>[0];

export class IntentSignerSolana
  implements ReturnType<typeof createIntentSignerViem>
{
  constructor(
    private account: { walletAddress: string },
    private solanaWallet: SolanaProvider,
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
          method: 'solana',
        }),
    });

    const signature = await this.solanaWallet.signMessage({
      message: new TextEncoder().encode(message),
    });

    return {
      payload: message,
      public_key: this.account.walletAddress,
      standard: 'raw_ed25519',
      signature: bs58.encode(signature),
    };
  }
}
