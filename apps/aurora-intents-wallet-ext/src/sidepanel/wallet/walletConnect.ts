import { createWalletConnectClient } from '@aurora-is-near/intents-connect-wallet/connect/walletconnect';

export { PAIRING_TTL_MS } from '@aurora-is-near/intents-connect-wallet/connect/walletconnect';

/**
 * The one WalletConnect client of the panel. Its session persists in the
 * extension's storage, so a connected mobile wallet survives reopening it.
 */
const client = createWalletConnectClient({
  metadata: {
    name: 'Aurora Intents',
    description: 'Swap, deposit and send across 35+ chains',
    url: window.location.origin,
  },
});

export const pairWalletConnect = client.pair;
export const abortWalletConnectPairing = client.abortPairing;
export const disconnectWalletConnect = client.disconnect;
export const createWalletConnectProvider = client.createProvider;
