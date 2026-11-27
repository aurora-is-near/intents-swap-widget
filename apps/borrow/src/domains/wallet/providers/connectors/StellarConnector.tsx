import { useStellarConnector } from '@aurora-is-near/intents-connect-wallet/connect/stellar';
import { toStellarWalletConnector } from '@aurora-is-near/intents-connect-wallet/stellar';
import type { StellarConnectorState } from '@aurora-is-near/intents-connect-wallet/connect/stellar';

import { useReport } from './useReport';
import type { ConnectorProps } from './types';

const stellarWalletOf = (stellar: StellarConnectorState) => {
  const provider = stellar.getProviders?.().stellar;

  return provider
    ? toStellarWalletConnector({
        id: stellar.id,
        name: 'Stellar',
        address: stellar.address ?? null,
        provider,
      }).connector
    : null;
};

/**
 * The Stellar connection (Stellar Wallets Kit) and its Intents Connect
 * wallet. Its own chunk, and the largest (the Stellar SDK): it loads only when
 * the kit has a saved session or the person picks Stellar.
 */
export function Connector({ onChange }: ConnectorProps) {
  const stellar = useStellarConnector();

  const key = [stellar.isConnected, stellar.address].join('|');

  useReport(
    () => ({ connector: stellar, wallet: stellarWalletOf(stellar) }),
    key,
    onChange,
  );

  return null;
}
