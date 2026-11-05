import UniversalProvider from '@walletconnect/universal-provider';
import {
  type Eip1193Provider,
  EVM_CHAIN_IDS,
  type WalletConnector,
} from '@aurora-is-near/intents-connect';

import { AURORA_WALLETCONNECT_PROJECT_ID } from '@/connect/projectId';
import { toEvmWalletConnector } from '@/evm/toWalletConnector';

/** How long a pairing QR stays valid. */
export const PAIRING_TTL_MS = 5 * 60_000;

export type WalletConnectMetadata = {
  name: string;
  description?: string;
  /** Your site's origin. It must be on the project's allowed-domains list. */
  url: string;
  icons?: string[];
};

export type WalletConnectClientOptions = {
  /** WalletConnect Cloud project id. Defaults to Aurora's. */
  projectId?: string;
  metadata: WalletConnectMetadata;
  /** EVM chain ids to request. Defaults to every EVM chain the engine routes. */
  chainIds?: readonly number[];
  /**
   * Keeps this client apart from any other WalletConnect client on the page:
   * its own storage keys and its own Core (WalletConnect shares one Core per
   * prefix through `globalThis`). Set it when the host page may run
   * WalletConnect itself, e.g. a script injected into a dapp.
   */
  storagePrefix?: string;
};

/** The mobile wallet on the other end of a session. */
export type WalletConnectPeer = {
  address: string;
  name: string;
  icon?: string;
};

export type WalletConnectClient = {
  /**
   * Starts a pairing: `onUri` receives the QR payload, and the promise
   * resolves once the wallet approves (or rejects). Replaces any previous
   * session — one mobile wallet at a time.
   */
  pair: (onUri: (uri: string) => void) => Promise<WalletConnectPeer>;
  /** Abandons a pairing in progress (the QR expired or the user left). */
  abortPairing: () => Promise<void>;
  /** The persisted session's wallet, if any — restored without UI. */
  getPeer: () => Promise<WalletConnectPeer | null>;
  disconnect: () => Promise<void>;
  /** Fires when the wallet ends the session from its side. */
  onSessionEnd: (listener: () => void) => () => void;
  /**
   * An EIP-1193 provider over the session. Chain switches stay local (the
   * session already covers every requested chain): later requests are sent
   * to the chain last switched to.
   */
  createProvider: () => Eip1193Provider;
};

type Session = NonNullable<UniversalProvider['session']>;

const peerOf = (session: Session): WalletConnectPeer | null => {
  // CAIP-10: `eip155:<chainId>:<address>`
  const address = session.namespaces.eip155?.accounts[0]?.split(':')[2];

  return address
    ? {
        address,
        name: session.peer.metadata.name,
        icon: session.peer.metadata.icons[0],
      }
    : null;
};

/**
 * A headless WalletConnect v2 client for EVM mobile wallets: render the
 * pairing URI as a QR yourself, then use the session like an injected wallet.
 * The session persists in the browser's storage, so a connected wallet
 * survives a reload (`getPeer`).
 */
export const createWalletConnectClient = ({
  projectId = AURORA_WALLETCONNECT_PROJECT_ID,
  metadata,
  chainIds = Object.values(EVM_CHAIN_IDS),
  storagePrefix,
}: WalletConnectClientOptions): WalletConnectClient => {
  const chains = [...new Set(chainIds)].map((id) => `eip155:${id}`);

  let providerPromise: Promise<UniversalProvider> | null = null;

  const getProvider = () => {
    providerPromise ??= UniversalProvider.init({
      projectId,
      metadata: { description: '', icons: [], ...metadata },
      ...(storagePrefix && { customStoragePrefix: storagePrefix }),
    }).catch((error: unknown) => {
      // A failed init (offline, blocked relay) may succeed on a later call.
      providerPromise = null;
      throw error;
    });

    return providerPromise;
  };

  return {
    pair: async (onUri) => {
      const provider = await getProvider();

      if (provider.session) {
        await provider.disconnect().catch(() => undefined);
      }

      provider.on('display_uri', onUri);

      try {
        const session = await provider.connect({
          optionalNamespaces: {
            eip155: {
              methods: [
                'personal_sign',
                'eth_sendTransaction',
                'wallet_switchEthereumChain',
                'wallet_addEthereumChain',
              ],
              chains,
              events: ['accountsChanged', 'chainChanged'],
            },
          },
        });

        const peer = session && peerOf(session);

        if (!peer) {
          throw new Error('The wallet did not share an EVM account');
        }

        return peer;
      } finally {
        provider.off('display_uri', onUri);
      }
    },

    abortPairing: async () => {
      (await getProvider()).abortPairingAttempt();
    },

    getPeer: async () => {
      const { session } = await getProvider();

      return session ? peerOf(session) : null;
    },

    disconnect: async () => {
      const provider = await getProvider();

      if (provider.session) {
        await provider.disconnect();
      }
    },

    onSessionEnd: (listener) => {
      let active = true;
      const handler = () => {
        if (active) {
          listener();
        }
      };

      void getProvider().then(
        (provider) => provider.on('session_delete', handler),
        () => undefined,
      );

      return () => {
        active = false;
        void getProvider().then(
          (provider) => provider.off('session_delete', handler),
          () => undefined,
        );
      };
    },

    createProvider: () => {
      let chain = chains[0] ?? 'eip155:1';

      return {
        request: async ({ method, params }) => {
          const provider = await getProvider();

          if (!provider.session) {
            throw new Error(
              'The mobile wallet is disconnected. Connect it again.',
            );
          }

          if (method === 'wallet_switchEthereumChain') {
            const [{ chainId }] = params as [{ chainId: string }];

            chain = `eip155:${Number.parseInt(chainId, 16)}`;
            provider.setDefaultChain(chain);

            return null;
          }

          return provider.request({ method, params }, chain);
        },
      };
    },
  };
};

/**
 * A WalletConnect session as an Intents Connect `WalletConnector`: erc191
 * signing and EVM transfers over the session. `disconnect` ends the session.
 */
export const toWalletConnectConnector = (
  client: WalletConnectClient,
  peer: WalletConnectPeer,
): WalletConnector => {
  const { connector } = toEvmWalletConnector({
    id: 'walletconnect',
    name: peer.name,
    address: peer.address,
    provider: client.createProvider(),
  });

  // `toEvmWalletConnector` only returns null without an address.
  return { ...connector!, disconnect: client.disconnect };
};
