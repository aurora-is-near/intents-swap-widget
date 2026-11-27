import { useNearConnector } from '@aurora-is-near/intents-connect-wallet/connect/near';
import { useStellarConnector } from '@aurora-is-near/intents-connect-wallet/connect/stellar';
import { toNearWalletConnector } from '@aurora-is-near/intents-connect-wallet/near';
import { toStellarWalletConnector } from '@aurora-is-near/intents-connect-wallet/stellar';
import { useEffect, useRef } from 'react';
import type { WalletConnector } from '@aurora-is-near/intents-connect';
import type { ChainWalletConnector } from '@aurora-is-near/intents-connect-wallet/connect';
import type { StellarConnectorState } from '@aurora-is-near/intents-connect-wallet/connect/stellar';

/** The NEAR and Stellar connections, and each one's Intents Connect wallet. */
export type ChainConnectorsState = {
  near: ChainWalletConnector;
  stellar: ChainWalletConnector;
  /** With its deposit transfer; `null` while NEAR is not connected. */
  nearWallet: WalletConnector | null;
  /** With its deposit transfer; `null` while Stellar is not connected. */
  stellarWallet: WalletConnector | null;
};

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
 * Runs the NEAR (near-connect) and Stellar (Stellar Wallets Kit) connectors
 * and reports them to `WalletSessionProvider`. Its own chunk, loaded after
 * the app renders: the two SDKs are about a quarter of the bundle. It still
 * loads at start-up, since the connectors restore a saved session on mount.
 *
 * The hooks return new objects every render, so it reports only when a
 * connection changes, which keeps the session from re-rendering in a loop.
 */
export function ChainConnectors({
  onChange,
}: {
  onChange: (state: ChainConnectorsState) => void;
}) {
  const near = useNearConnector();
  const stellar = useStellarConnector();
  const latestRef = useRef({ near, stellar });

  latestRef.current = { near, stellar };

  const key = [
    near.isConnected,
    near.address,
    near.getPublicKey?.(),
    near.wallet !== undefined,
    stellar.isConnected,
    stellar.address,
  ].join('|');

  useEffect(() => {
    const { current } = latestRef;

    onChange({
      near: current.near,
      stellar: current.stellar,
      nearWallet: toNearWalletConnector(current.near).connector,
      stellarWallet: stellarWalletOf(current.stellar),
    });
  }, [key, onChange]);

  return null;
}
