import { base58, base64 } from '@scure/base';

import { WidgetError } from '@/errors';
import type { PreparedIntent, SignedIntent } from '@/types/intents';
import type {
  NearWalletBase as NearWallet,
  NearSignedMessage as SignedMessage,
} from '@/types/near';

import type { PreparedIntentSigner } from './types';

type Args = {
  getProvider: () => NearWallet;
  walletAddress: string;
};

export const createNearWalletSigner = ({
  walletAddress,
  getProvider,
}: Args): PreparedIntentSigner => {
  return {
    standard: 'nep413',
    signIntent: async (intent: PreparedIntent): Promise<SignedIntent> => {
      if (intent.standard !== 'nep413') {
        throw new WidgetError(
          `NEAR signer cannot sign ${intent.standard} payload`,
        );
      }

      const nearWallet = getProvider();

      if (!nearWallet.signMessage) {
        throw new WidgetError('Near wallet has no signMessage method exposed');
      }

      let signedMessage: SignedMessage | undefined | void;

      try {
        signedMessage = await nearWallet.signMessage({
          message: intent.payload.message,
          recipient: intent.payload.recipient,
          nonce: Buffer.from(base64.decode(intent.payload.nonce)),
          ...(typeof intent.payload.callbackUrl === 'string'
            ? { callbackUrl: intent.payload.callbackUrl }
            : {}),
        });
      } catch (e: unknown) {
        throw new WidgetError('Near wallet failed to sign a message', {
          cause: e,
        });
      }

      if (!signedMessage) {
        throw new WidgetError('Near wallet failed to sign a message');
      }

      if (signedMessage.accountId !== walletAddress) {
        throw new WidgetError(
          'Connected NEAR account does not match the widget',
        );
      }

      const publicKey = signedMessage.publicKey.startsWith('ed25519:')
        ? signedMessage.publicKey
        : `ed25519:${signedMessage.publicKey}`;

      const signature = signedMessage.signature.startsWith('ed25519:')
        ? signedMessage.signature
        : `ed25519:${base58.encode(base64.decode(signedMessage.signature))}`;

      return {
        ...intent,
        public_key: publicKey,
        signature,
      };
    },
  };
};
