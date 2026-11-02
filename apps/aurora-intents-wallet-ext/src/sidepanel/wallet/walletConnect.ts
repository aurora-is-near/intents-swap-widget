import UniversalProvider from '@walletconnect/universal-provider';

import {
  CHAIN_IDS_MAP,
  EVM_CHAINS,
} from '@aurora-is-near/intents-swap-widget/constants';
import type { EvmProvider } from '@aurora-is-near/intents-swap-widget';

/** Aurora's WalletConnect Cloud project, as in intents-connect-wallet's AppKit preset. */
const PROJECT_ID = '76f61d4322c80976d1a24a1263a9d082';

/** How long a pairing QR stays valid. */
export const PAIRING_TTL_MS = 5 * 60_000;

const EVM_CAIP_CHAINS = EVM_CHAINS.map(
  (chain) => `eip155:${CHAIN_IDS_MAP[chain]}`,
);

type Eip1193Provider = Exclude<EvmProvider, () => unknown>;

let providerPromise: Promise<UniversalProvider> | null = null;

/**
 * The one WalletConnect client of the panel. Its session persists in the
 * extension's storage, so a connected mobile wallet survives reopening it.
 */
const getProvider = () => {
  providerPromise ??= UniversalProvider.init({
    projectId: PROJECT_ID,
    metadata: {
      name: 'Aurora Intents',
      description: 'Swap, deposit and send across 35+ chains',
      url: window.location.origin,
      icons: [],
    },
  });

  return providerPromise;
};

type WalletConnectPeer = {
  address: string;
  name: string;
  icon?: string;
};

/**
 * Starts a pairing: `onUri` receives the QR payload, and the promise resolves
 * once the wallet approves (or rejects). Replaces any previous session — the
 * panel holds one mobile wallet at a time.
 */
export const pairWalletConnect = async (
  onUri: (uri: string) => void,
): Promise<WalletConnectPeer> => {
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
          chains: EVM_CAIP_CHAINS,
          events: ['accountsChanged', 'chainChanged'],
        },
      },
    });

    // CAIP-10: `eip155:<chainId>:<address>`
    const account = session?.namespaces.eip155?.accounts[0];
    const address = account?.split(':')[2];

    if (!session || !address) {
      throw new Error('The wallet did not share an EVM account');
    }

    return {
      address,
      name: session.peer.metadata.name,
      icon: session.peer.metadata.icons[0],
    };
  } finally {
    provider.off('display_uri', onUri);
  }
};

/** Abandons a pairing in progress (the QR expired or the user left). */
export const abortWalletConnectPairing = async () => {
  (await getProvider()).abortPairingAttempt();
};

export const disconnectWalletConnect = async () => {
  const provider = await getProvider();

  if (provider.session) {
    await provider.disconnect();
  }
};

/**
 * An EIP-1193 provider over the WalletConnect session. Chain switches stay
 * local (the session already covers every EVM chain): later requests are
 * sent to the chain last switched to.
 */
export const createWalletConnectProvider = (): Eip1193Provider => {
  let chain = 'eip155:1';

  return {
    request: async ({ method, params }) => {
      const provider = await getProvider();

      if (!provider.session) {
        throw new Error('The mobile wallet is disconnected. Connect it again.');
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
};
