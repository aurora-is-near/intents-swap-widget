import { utils } from '@defuse-protocol/internal-utils';
import { createIntentSignerViem } from '@defuse-protocol/bridge-sdk';
import type { Eip1193Provider } from 'ethers';

import { WidgetError } from '@/errors';

type SignIntentResult = ReturnType<
  ReturnType<typeof createIntentSignerViem>['signIntent']
>;
type SignIntentPayload = Parameters<
  ReturnType<typeof createIntentSignerViem>['signIntent']
>[0];

interface IPrivySigner extends ReturnType<typeof createIntentSignerViem> {
  getProvider: () => Promise<Eip1193Provider>;
}

export class IntentSignerPrivy implements IPrivySigner {
  declare getProvider: () => Promise<Eip1193Provider>;

  constructor(
    private account: { walletAddress: string },
    getProvider: () => Promise<Eip1193Provider>,
  ) {
    this.getProvider = getProvider;
  }

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
          method: 'evm',
        }),
    });

    const provider = await this.getProvider();
    const accounts = await provider.request({ method: 'eth_requestAccounts' });
    const signature = await provider.request({
      method: 'personal_sign',
      params: [message, accounts[0]],
    });

    if (signature == null) {
      throw new WidgetError('No signature is returned');
    }

    return {
      payload: message,
      standard: 'erc191',
      signature: utils.transformERC191Signature(signature),
    };
  }
}
