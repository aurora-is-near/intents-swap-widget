import bs58 from 'bs58';

import { WidgetError } from '@/errors';
import type { PreparedIntent, SignedIntent } from '@/types/intents';
import type { StellarNetworkPlugin } from '@/types/connectors';
import type { StellarProvider } from '@/types/providers';

import type { PreparedIntentSigner } from './types';

function transformStellarSignature(signature: string) {
  return `ed25519:${bs58.encode(Buffer.from(signature, 'base64'))}`;
}

export class IntentSignerStellar implements PreparedIntentSigner {
  readonly standard = 'sep53' as const;

  constructor(
    private account: { walletAddress: string },
    private stellarWallet: StellarProvider,
    private plugin: StellarNetworkPlugin,
  ) {}

  async signIntent(intent: PreparedIntent): Promise<SignedIntent> {
    if (intent.standard !== this.standard) {
      throw new WidgetError(
        `Stellar signer cannot sign ${intent.standard} payload`,
      );
    }

    const { signedMessage, signerAddress } =
      await this.stellarWallet.signMessage(intent.payload);

    if (signerAddress && signerAddress !== this.account.walletAddress) {
      throw new WidgetError(
        'Connected Stellar account does not match the widget',
      );
    }

    const publicKeyBytes = this.plugin.decodePublicKey(this.stellarWallet);

    return {
      ...intent,
      public_key: `ed25519:${bs58.encode(publicKeyBytes)}`,
      signature: transformStellarSignature(signedMessage),
    };
  }
}
