import {
  CONNECTOR_IDS,
  EVM_SOLANA_WALLET_OPTION,
  NEAR_WALLET_OPTION,
  STELLAR_WALLET_OPTION,
  useWalletSelector,
  WalletSelectorModal,
} from '@aurora-is-near/intents-connect-wallet/connect';
import {
  useAppKitConnector,
  useIntentsConnectWallet,
} from '@aurora-is-near/intents-connect-wallet/connect/appkit';
import { useEffect, useState } from 'react';
import type { WalletConnector } from '@aurora-is-near/intents-connect';
import type { ComponentType, ReactNode } from 'react';

import { useConnectRequest } from '../hooks/useConnectRequest';
import { WALLET_MODAL_THEME } from '../walletModalTheme';
import { loadChainConnectors } from './loadChainConnectors';
import { WalletSessionContext } from './walletSessionContext';
import type { WalletFamily, WalletSession } from '../types';
import type { ChainConnectorsState } from './ChainConnectors';

/** The modal's rows until the NEAR and Stellar connectors have loaded. */
const EVM_SOLANA_OPTIONS = [EVM_SOLANA_WALLET_OPTION];

/** The modal's rows: every family Borrow installs a connector for. */
const ALL_OPTIONS = [
  EVM_SOLANA_WALLET_OPTION,
  NEAR_WALLET_OPTION,
  STELLAR_WALLET_OPTION,
];

type ChainConnectorsComponent = ComponentType<{
  onChange: (state: ChainConnectorsState) => void;
}>;

/**
 * Loads the NEAR and Stellar connectors once, after the first render. A
 * failed load leaves EVM and Solana working and reports why.
 */
const useChainConnectors = () => {
  const [Connectors, setConnectors] = useState<ChainConnectorsComponent>();
  const [chains, setChains] = useState<ChainConnectorsState>();

  useEffect(() => {
    let mounted = true;

    loadChainConnectors().then(
      (module) => {
        if (mounted) {
          setConnectors(() => module.ChainConnectors);
        }
      },
      (error: unknown) => {
        // A configuration-level failure (a missing chunk after a deploy, a
        // blocked request), reported once like the API key check.
        console.error(
          '[Borrow] NEAR and Stellar wallets did not load; EVM and Solana still work.',
          error,
        );
      },
    );

    return () => {
      mounted = false;
    };
  }, []);

  const connectors = Connectors ? <Connectors onChange={setChains} /> : null;

  return { chains, connectors };
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
 * The connected family's Intents Connect wallet, with its deposit transfer.
 * AppKit builds its own; NEAR's and Stellar's come from `ChainConnectors`.
 * One entry per family: a new family is a compile error here.
 */
const walletFor = (
  family: WalletFamily | null,
  appKit: WalletConnector | null,
  chains: ChainConnectorsState | undefined,
): WalletConnector | null => {
  if (family === null) {
    return null;
  }

  const wallets: Record<WalletFamily, WalletConnector | null> = {
    evm: appKit,
    sol: appKit,
    near: chains?.nearWallet ?? null,
    stellar: chains?.stellarWallet ?? null,
  };

  return wallets[family];
};

/**
 * One wallet connection across EVM and Solana (Reown AppKit), NEAR
 * (near-connect) and Stellar (Stellar Wallets Kit), picked in the wallet
 * package's connect modal drawn in Borrow's theme. Connections are
 * exclusive: picking a family disconnects the others (`useWalletSelector`).
 *
 * Must sit inside `AppKitProvider`. Each connector hook runs once: the NEAR
 * and Stellar ones hold their connection in local state. Those two load in
 * their own chunk after the first render (`ChainConnectors`); their rows
 * join the modal once it is in.
 *
 * `connect()` keeps the contract the borrow flow's reconnect relies on
 * (`useConnectRequest`): it resolves once a wallet is connected and rejects
 * when the modal closes without one.
 */
export function WalletSessionProvider({ children }: { children: ReactNode }) {
  const appKit = useIntentsConnectWallet();
  const evmSolana = useAppKitConnector();
  const { chains, connectors } = useChainConnectors();
  const selector = useWalletSelector(
    chains ? [evmSolana, chains.near, chains.stellar] : [evmSolana],
  );

  const { connected } = selector;
  const family = familyOf(connected?.id, appKit.family);
  const isConnected = connected !== undefined;

  const { open, connect, pick, close } = useConnectRequest({
    isConnected,
    select: selector.select,
  });

  const session: WalletSession = {
    address: connected?.address,
    isConnected,
    family,
    wallet: walletFor(family, appKit.wallet, chains),
    connect,
    disconnect: () => selector.disconnect(),
  };

  return (
    <WalletSessionContext.Provider value={session}>
      {children}
      {connectors}
      <WalletSelectorModal
        onClose={close}
        onSelect={pick}
        open={open}
        options={chains ? ALL_OPTIONS : EVM_SOLANA_OPTIONS}
        theme={WALLET_MODAL_THEME}
      />
    </WalletSessionContext.Provider>
  );
}
