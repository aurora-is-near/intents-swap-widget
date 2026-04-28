import { createIntentSignerViem } from '@defuse-protocol/intents-sdk';
import { utils } from '@defuse-protocol/internal-utils';
import { base58, hex } from '@scure/base';
import { TronProvider } from '../../../types/providers';

type SignIntentResult = ReturnType<
  ReturnType<typeof createIntentSignerViem>['signIntent']
>;
type SignIntentPayload = Parameters<
  ReturnType<typeof createIntentSignerViem>['signIntent']
>[0];

export class IntentSignerTron
  implements ReturnType<typeof createIntentSignerViem>
{
  constructor(
    private account: { walletAddress: string },
    private tronWallet: TronProvider,
  ) {}

  async signIntent(intent: SignIntentPayload): SignIntentResult {
    const signerId = `0x${hex.encode(base58.decode(this.account.walletAddress).slice(0, 21)).substring(2)}`;

    const message = JSON.stringify({
      verifying_contract: intent.verifying_contract,
      deadline: intent.deadline,
      nonce: intent.nonce,
      intents: intent.intents,
      signer_id: intent.signer_id ?? signerId,
    });

    let signature: string;

    if (this.tronWallet.request) {
      const result = await this.tronWallet.request({
        method: 'tron_signMessageV2',
        params: { message },
      });

      signature = result as string;
    } else if (this.tronWallet.signMessage) {
      ({ signature } = await this.tronWallet.signMessage(message));
    } else {
      throw new Error('Tron provider does not support message signing.');
    }

    return {
      payload: message,
      standard: 'tip191',
      signature: utils.transformERC191Signature(signature),
    };
  }
}
