import {
  createIntentsApi,
  createIntentsConnectApi,
  DEFAULT_RPCS,
} from '@aurora-is-near/intents-connect';
import { createWalletConnectClient } from '@aurora-is-near/intents-connect-wallet/connect/walletconnect';
import type { WalletSource } from '@aurora-is-near/intents-connect-wallet/detect';
import type { WalletConnectorOptions } from '@aurora-is-near/intents-connect-wallet/detect/connector';
import { stellarWallets } from '@aurora-is-near/intents-connect-wallet/detect/stellar';
import { tronWallets } from '@aurora-is-near/intents-connect-wallet/detect/tron';

/** Empty counts as unset. */
const env = (value: unknown) =>
  typeof value === 'string' && value !== '' ? value : undefined;

const INTENTS_API_KEY = env(import.meta.env.VITE_INTENTS_API_KEY);

if (!INTENTS_API_KEY) {
  // eslint-disable-next-line no-console
  console.error(
    '[Aurora Intents] VITE_INTENTS_API_KEY is not set: add it to apps/intents-connect-aave-ext/.env.local and rebuild.',
  );
}

export const ALCHEMY_API_KEY = env(import.meta.env.VITE_ALCHEMY_API_KEY);

const ALCHEMY_NETWORK: Record<string, string> = {
  eth: 'eth-mainnet',
  base: 'base-mainnet',
  arb: 'arb-mainnet',
  pol: 'polygon-mainnet',
  monad: 'monad-mainnet',
};

/** Reads Aave's reserves: Alchemy with a key, a public RPC without. */
export const evmRpcUrl = (chain: string): string => {
  const network = ALCHEMY_NETWORK[chain];

  return ALCHEMY_API_KEY && network
    ? `https://${network}.g.alchemy.com/v2/${ALCHEMY_API_KEY}`
    : (DEFAULT_RPCS[chain]?.[0] ?? '');
};

/** Builds and submits Solana deposit transfers. */
const SOLANA_RPC_URL = ALCHEMY_API_KEY
  ? `https://solana-mainnet.g.alchemy.com/v2/${ALCHEMY_API_KEY}`
  : 'https://solana-rpc.publicnode.com';

/** Executions: quotes, intermediary accounts, signatures, status. */
export const intentsConnectApi = createIntentsConnectApi({
  baseUrl:
    env(import.meta.env.VITE_INTENTS_CONNECT_API_URL) ??
    'https://intents-connect-alpha-api.aurora.dev',
  apiKey: INTENTS_API_KEY ?? '',
});

/** Tokens, balances, user sessions. */
export const intentsApi = createIntentsApi({ apiKey: INTENTS_API_KEY ?? '' });

/**
 * Wallet families detection doesn't build in: Stellar (Freighter, xBull,
 * LOBSTR, Hana) and TRON (TronLink). Created once: the detector is keyed by
 * source ids.
 */
export const walletSources: readonly WalletSource[] = [
  stellarWallets(),
  tronWallets(),
];

/** A module constant: the modal re-derives its connector when it changes. */
export const connectorOptions: WalletConnectorOptions = {
  sol: { rpcUrl: SOLANA_RPC_URL },
};

/**
 * Phone wallets by QR, on a dev Reown project that has app.aave.com on its
 * allowed domains, so Aurora's shared project (the SDK default) doesn't need
 * it. A public id; it ships in the bundle. The prefix keeps the client apart
 * from Aave's own WalletConnect: its own Core and its own storage keys.
 */
export const walletConnect = createWalletConnectClient({
  projectId:
    env(import.meta.env.VITE_WALLETCONNECT_PROJECT_ID) ??
    '5450b606db3dbafda503a7f9d0e6233b',
  metadata: {
    name: 'Aurora Intents',
    description: 'Supply to Aave from any wallet, on any chain',
    url: window.location.origin,
  },
  storagePrefix: 'aurora-intents',
});
