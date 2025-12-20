import { utils } from '@defuse-protocol/internal-utils';
import { createIntentSignerViem } from '@defuse-protocol/intents-sdk';

import { EvmProvider } from '@/types';
import { WidgetError } from '@/errors';

type SignIntentResult = ReturnType<
  ReturnType<typeof createIntentSignerViem>['signIntent']
>;
type SignIntentPayload = Parameters<
  ReturnType<typeof createIntentSignerViem>['signIntent']
>[0];

interface IPrivySigner extends ReturnType<typeof createIntentSignerViem> {
  provider: EvmProvider;
}

export class IntentSignerPrivy implements IPrivySigner {
  declare provider: EvmProvider;

  constructor(
    private account: { walletAddress: string },
    provider: EvmProvider,
  ) {
    this.provider = provider;
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

    const resolvedProvider =
      typeof this.provider === 'function'
        ? await this.provider()
        : this.provider;

    const accounts = await resolvedProvider.request({
      method: 'eth_requestAccounts',
    });

    const signature = await resolvedProvider.request({
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
