import { createIntentSignerNEP413 } from '@defuse-protocol/bridge-sdk';
import type {
  Wallet as NearWallet,
  SignedMessage,
} from '@near-wallet-selector/core';

type Args = {
  getProvider: () => NearWallet;
  walletAddress: string;
};

export const createNearWalletSigner = ({
  walletAddress,
  getProvider,
}: Args): ReturnType<typeof createIntentSignerNEP413> => {
  return createIntentSignerNEP413({
    accountId: walletAddress,
    signMessage: async (nep413Payload) => {
      const nearWallet = getProvider();

      if (!nearWallet.signMessage) {
        throw new Error('Near wallet has no signMessage method exposed');
      }

      let signedMessage: SignedMessage | undefined | void;

      try {
        signedMessage = await nearWallet.signMessage({
          ...nep413Payload,
          nonce: Buffer.from(nep413Payload.nonce),
        });
      } catch (e: unknown) {
        throw new Error('Near wallet failed to sign a message', { cause: e });
      }

      if (!signedMessage) {
        throw new Error('Near wallet failed to sign a message');
      }

      return {
        publicKey: signedMessage.publicKey,
        signature: signedMessage.signature,
      };
    },
  });
};
