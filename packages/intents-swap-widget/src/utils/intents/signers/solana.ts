import bs58 from 'bs58';

import { WidgetError } from '@/errors';
import type { PreparedIntent, SignedIntent } from '@/types/intents';
import type { SolanaProvider } from '@/types/providers';

import type { PreparedIntentSigner } from './types';

export class IntentSignerSolana implements PreparedIntentSigner {
  readonly standard = 'raw_ed25519' as const;

  constructor(
    private account: { walletAddress: string },
    private solanaWallet: SolanaProvider,
  ) {}

  async signIntent(intent: PreparedIntent): Promise<SignedIntent> {
    if (intent.standard !== this.standard) {
      throw new WidgetError(
        `Solana signer cannot sign ${intent.standard} payload`,
      );
    }

    const providerPublicKey = this.solanaWallet.publicKey?.toString();

    if (providerPublicKey && providerPublicKey !== this.account.walletAddress) {
      throw new WidgetError(
        'Connected Solana account does not match the widget',
      );
    }

    const signature = await this.solanaWallet.signMessage(
      new TextEncoder().encode(intent.payload),
    );

    return {
      ...intent,
      public_key: `ed25519:${this.account.walletAddress}`,
      signature: `ed25519:${bs58.encode(signature)}`,
    };
  }
}
