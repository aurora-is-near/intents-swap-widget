import { utils } from '@defuse-protocol/internal-utils';

import { WidgetError } from '@/errors';
import type { EvmProvider } from '@/types';
import type { PreparedIntent, SignedIntent } from '@/types/intents';

import type { PreparedIntentSigner } from './types';

export class IntentSignerPrivy implements PreparedIntentSigner {
  readonly standard = 'erc191' as const;

  constructor(
    private account: { walletAddress: string },
    private provider: EvmProvider,
  ) {}

  async signIntent(intent: PreparedIntent): Promise<SignedIntent> {
    if (intent.standard !== this.standard) {
      throw new WidgetError(
        `EVM signer cannot sign ${intent.standard} payload`,
      );
    }

    const resolvedProvider =
      typeof this.provider === 'function'
        ? await this.provider()
        : this.provider;

    const accounts = await resolvedProvider.request({
      method: 'eth_requestAccounts',
    });

    if (!Array.isArray(accounts)) {
      throw new WidgetError('EVM provider returned no accounts');
    }

    const signingAccount = accounts.find(
      (account): account is string =>
        typeof account === 'string' &&
        account.toLowerCase() === this.account.walletAddress.toLowerCase(),
    );

    if (!signingAccount) {
      throw new WidgetError('Connected EVM account does not match the widget');
    }

    const signature = await resolvedProvider.request({
      method: 'personal_sign',
      params: [intent.payload, signingAccount],
    });

    if (typeof signature !== 'string') {
      throw new WidgetError('No signature is returned');
    }

    return {
      ...intent,
      signature: utils.transformERC191Signature(signature),
    };
  }
}
