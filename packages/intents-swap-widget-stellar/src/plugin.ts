import { StrKey } from '@stellar/stellar-sdk';
import type { StellarNetworkPlugin } from '@aurora-is-near/intents-swap-widget';

import { fetchNativeBalances } from './fetchNativeBalances';
import { makeTransfer } from './makeTransfer';

export const stellar: StellarNetworkPlugin = {
  makeTransfer,
  decodePublicKey: (provider) => {
    if (!provider.publicKey) {
      throw new Error('No public key found in Stellar provider.');
    }

    return StrKey.decodeEd25519PublicKey(provider.publicKey);
  },
  getNativeBalances: (provider) => {
    if (!provider.publicKey) {
      return Promise.resolve({ xlmStroops: '0', usdcStroops: '0' });
    }

    return fetchNativeBalances(provider.publicKey);
  },
};
