import { useNearConnector } from '@aurora-is-near/intents-connect-wallet/connect/near';
import { toNearWalletConnector } from '@aurora-is-near/intents-connect-wallet/near';

import { useReport } from './useReport';
import type { ConnectorProps } from './types';

/**
 * The NEAR connection (near-connect) and its Intents Connect wallet. Its own
 * chunk, loaded right after the first render: near-connect restores a saved
 * session on mount.
 */
export function Connector({ onChange }: ConnectorProps) {
  const near = useNearConnector();

  const key = [
    near.isConnected,
    near.address,
    near.getPublicKey?.(),
    near.wallet !== undefined,
  ].join('|');

  useReport(
    () => ({
      connector: near,
      wallet: toNearWalletConnector(near).connector,
    }),
    key,
    onChange,
  );

  return null;
}
