import type { TronProvider } from '@aurora-is-near/intents-connect';

import { callTronWallet } from '@/tron/errors';
import type { TronInjectedProvider, TronWebLike } from '@/tron/types';

/**
 * The wallet's TronWeb, read when it's needed: TronLink sets it only once
 * the site is connected, and replaces it on reconnect.
 */
export const requireTronWeb = (provider: TronInjectedProvider): TronWebLike => {
  const { tronWeb } = provider;

  if (!tronWeb) {
    throw new Error(
      'The TRON wallet is locked or not connected to this site. Unlock it and try again.',
    );
  }

  return tronWeb;
};

/**
 * A wallet's TronWeb as the `TronProvider` that `tip191` signs with. The
 * signature is checked against `address` (`verifyMessageV2`) before it's
 * submitted: one from another account fails here, with nothing sent.
 */
export const tronProvider = (
  provider: TronInjectedProvider,
  address: string,
): TronProvider => ({
  address,
  signMessage: async (message) => {
    const tronWeb = requireTronWeb(provider);
    const signature = await callTronWallet(() =>
      tronWeb.trx.signMessageV2(message),
    );

    if (tronWeb.trx.verifyMessageV2) {
      const signer = await tronWeb.trx
        .verifyMessageV2(message, signature)
        .catch(() => undefined);

      if (signer !== address) {
        throw new Error(
          'The wallet signed with another account. Nothing was submitted.',
        );
      }
    }

    return signature;
  },
});
