import {
  CONNECTOR_IDS,
  useWalletSelector,
} from '@aurora-is-near/intents-connect-wallet/connect';
import { lazy, Suspense, useEffect, useState } from 'react';
import type { WalletConnector } from '@aurora-is-near/intents-connect';
import type { ReactNode } from 'react';

import { useConnectRequest } from '../hooks/useConnectRequest';
import { connectorLoaders } from './connectors/loaders';
import { useLazyConnector } from './connectors/useLazyConnector';
import { WalletSessionContext } from './walletSessionContext';
import type { WalletFamily, WalletSession } from '../types';

const loadConnectModal = () => import('./ConnectModal');

const ConnectModal = lazy(() =>
  loadConnectModal().then((module) => ({ default: module.ConnectModal })),
);

/** Where Stellar Wallets Kit keeps a connected address between visits. */
const STELLAR_SESSION_KEY = '@StellarWalletsKit/activeAddress';

const hasStellarSession = () => {
  try {
    return localStorage.getItem(STELLAR_SESSION_KEY) !== null;
  } catch {
    return false;
  }
};

/** The connected connector's family; AppKit's row is EVM or Solana. */
const familyOf = (
  connectorId: string | undefined,
  appKitFamily: 'evm' | 'sol' | null,
): WalletFamily | null => {
  switch (connectorId) {
    case CONNECTOR_IDS.evmSolana:
      return appKitFamily;
    case CONNECTOR_IDS.near:
      return 'near';
    case CONNECTOR_IDS.stellar:
      return 'stellar';
    default:
      return null;
  }
};

/**
 * One wallet connection across EVM and Solana (Reown AppKit), NEAR
 * (near-connect) and Stellar (Stellar Wallets Kit), picked in the wallet
 * package's connect modal drawn in Borrow's theme. Connections are
 * exclusive: picking a family disconnects the others (`useWalletSelector`).
 *
 * Each family is its own chunk (`connectors/`), so none of the wallet SDKs
 * holds up the first paint. AppKit and NEAR load right after the first render,
 * since they restore a saved session on mount; Stellar, the largest, loads
 * only when the kit has a saved session or the person picks it. Until a
 * family has loaded, its row still shows and picking it waits for the load.
 * The modal's own chunk is fetched once AppKit is in.
 *
 * `connect()` keeps the contract the borrow flow's reconnect relies on
 * (`useConnectRequest`): it resolves once a wallet is connected and rejects
 * when the modal closes without one.
 */
export function WalletSessionProvider({ children }: { children: ReactNode }) {
  const [stellarEager] = useState(hasStellarSession);
  const evmSolana = useLazyConnector({
    id: CONNECTOR_IDS.evmSolana,
    load: connectorLoaders.appKit,
    eager: true,
    name: 'EVM and Solana',
  });

  const near = useLazyConnector({
    id: CONNECTOR_IDS.near,
    load: connectorLoaders.near,
    eager: true,
    name: 'NEAR',
  });

  const stellar = useLazyConnector({
    id: CONNECTOR_IDS.stellar,
    load: connectorLoaders.stellar,
    eager: stellarEager,
    name: 'Stellar',
  });

  const families = [evmSolana, near, stellar];
  const selector = useWalletSelector(families.map((f) => f.connector));

  const { connected } = selector;
  const family = familyOf(connected?.id, evmSolana.report?.family ?? null);
  const isConnected = connected !== undefined;

  const { open, connect, pick, close } = useConnectRequest({
    isConnected,
    select: selector.select,
  });

  // The modal's chunk (its dialog and wallet icons) is fetched once AppKit
  // is in, so the first Connect click does not wait on it.
  const appKitLoaded = evmSolana.report !== undefined;

  useEffect(() => {
    if (appKitLoaded) {
      loadConnectModal().catch(() => {});
    }
  }, [appKitLoaded]);

  // Mounted from the first open on, so the modal can animate closed.
  const [modalLoaded, setModalLoaded] = useState(false);

  useEffect(() => {
    if (open) {
      setModalLoaded(true);
    }
  }, [open]);

  /** One entry per family: a new family is a compile error here. */
  const wallets: Record<WalletFamily, WalletConnector | null> = {
    evm: evmSolana.report?.wallet ?? null,
    sol: evmSolana.report?.wallet ?? null,
    near: near.report?.wallet ?? null,
    stellar: stellar.report?.wallet ?? null,
  };

  const session: WalletSession = {
    address: connected?.address,
    isConnected,
    family,
    wallet: family === null ? null : wallets[family],
    connect,
    disconnect: () => selector.disconnect(),
  };

  return (
    <WalletSessionContext.Provider value={session}>
      {children}
      {evmSolana.element}
      {near.element}
      {stellar.element}
      {(open || modalLoaded) && (
        <Suspense fallback={null}>
          <ConnectModal
            available={families
              .filter((f) => !f.failed)
              .map((f) => f.connector.id)}
            onClose={close}
            onSelect={pick}
            open={open}
          />
        </Suspense>
      )}
    </WalletSessionContext.Provider>
  );
}
