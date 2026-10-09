/**
 * Wire protocol between the three extension contexts that reach a page wallet:
 *
 *   side panel ⇄ (chrome.tabs / chrome.runtime) ⇄ relay (isolated world)
 *   relay ⇄ (private MessagePort) ⇄ page bridge (MAIN world) ⇄ wallet
 *
 * The relay and the page bridge share `window`, so the MessagePort is handed
 * over once at `document_start` — before any page script runs — and all later
 * traffic stays on that port, out of reach of the page's own `message`
 * listeners.
 */

export const CHANNEL = 'aurora-intents-wallet-ext';

/**
 * Solana requests are bridge methods rather than wallet RPC: Wallet Standard
 * wallets expose features, not a `request()` endpoint. Bytes travel as base64
 * because chrome messaging is JSON-only.
 */
export const SOLANA_METHODS = {
  /** `{ name, silent? }` → connected address. */
  connect: 'sol_connect',
  /** `{ name, message }` (base64) → signature (base64). */
  signMessage: 'sol_signMessage',
  /** `{ name, transaction }` (base64, serialized) → signed (base64). */
  signTransaction: 'sol_signTransaction',
} as const;

/**
 * NEAR requests are bridge methods too: NEAR wallets inject an object (the
 * near-connect `near-wallet-injected` protocol), not an RPC endpoint. Each
 * names its wallet by manifest `id`; bytes travel as base64.
 */
export const NEAR_METHODS = {
  /** `{ id }` → `{ accountId, publicKey }` (the wallet's sign-in prompt). */
  connect: 'near_connect',
  /** `{ id, message, recipient, nonce }` (NEP-413) → `{ accountId, publicKey, signature }`. */
  signMessage: 'near_signMessage',
  /** `{ id, transactions }` (wallet-selector format) → `[{ transaction: { hash } }]`. */
  signAndSendTransactions: 'near_signAndSendTransactions',
} as const;

/**
 * Methods the side panel may call on the page wallets. Everything the SDK's
 * signers and deposit transfers need, plus harmless EVM reads. Anything else
 * is refused by the relay.
 */
export const ALLOWED_METHODS = new Set<string>([
  'eth_accounts',
  'eth_requestAccounts',
  'eth_chainId',
  'personal_sign',
  'eth_sendTransaction',
  'wallet_switchEthereumChain',
  'wallet_addEthereumChain',
  'eth_blockNumber',
  'eth_call',
  'eth_estimateGas',
  'eth_gasPrice',
  'eth_maxPriorityFeePerGas',
  'eth_getBlockByNumber',
  'eth_getTransactionCount',
  'eth_getTransactionReceipt',
  ...Object.values(SOLANA_METHODS),
  ...Object.values(NEAR_METHODS),
]);

export type WalletInfo = {
  name: string;
  icon?: string;
  rdns?: string;
};

export type EvmWalletEntry = {
  /** Stable per wallet: its EIP-6963 `rdns` (or `legacy` for `window.ethereum`). */
  id: string;
  info: WalletInfo;
  /** Accounts the wallet shares with this site; empty until it is connected. */
  accounts: string[];
  chainId: string | null;
};

/** A Wallet Standard wallet that can sign Solana messages and transactions. */
export type SolanaWalletEntry = {
  info: WalletInfo;
  /** The account it shares with this site, or `null` until connected. */
  address: string | null;
};

/** A NEAR wallet announced through near-connect's injection protocol. */
export type NearWalletEntry = {
  /** Its manifest id, e.g. `hot-wallet`. */
  id: string;
  info: WalletInfo;
};

export type WalletState = {
  evm: EvmWalletEntry[];
  /** The EVM wallet the site itself is using, when it can be told. */
  siteEvmWallet: string | null;
  solana: SolanaWalletEntry[];
  near: NearWalletEntry[];
};

type BridgeError = { code?: number; message: string; data?: unknown };

export type BridgeResponse<T = unknown> =
  | { ok: true; result: T }
  | { ok: false; error: BridgeError };

export type WalletEvent = 'accountsChanged' | 'chainChanged' | 'solanaChanged';

/** Side panel → relay (`chrome.tabs.sendMessage`). */
export type PanelMessage =
  | { channel: typeof CHANNEL; type: 'ping' }
  | {
      channel: typeof CHANNEL;
      type: 'request';
      /** EVM wallet id to route an RPC method to. */
      wallet?: string;
      method: string;
      params?: unknown[] | object;
    };

/** Relay → side panel (`chrome.runtime.sendMessage`). */
export type PanelEvent = {
  channel: typeof CHANNEL;
  type: 'event';
  event: WalletEvent;
  data: unknown;
};

/**
 * A site's "Deposit with Aurora" button → background: open the side panel on
 * that app's deposit form. `account` is the app account the page shows, when
 * it shows one.
 */
export type OpenAppMessage = {
  channel: typeof CHANNEL;
  type: 'open-app';
  app: 'polymarket';
  account?: string;
};

/** What the background leaves for the side panel (`storage.session`). */
export type AppLaunch = {
  app: 'polymarket';
  tabId: number;
  account?: string;
  at: number;
};

export const APP_LAUNCH_KEY = 'appLaunch';

/** Relay → page bridge (over the private port). */
export type PortRequest =
  | { id: string; type: 'ping' }
  | {
      id: string;
      type: 'request';
      wallet?: string;
      method: string;
      params?: unknown[] | object;
    };

/** Page bridge → relay (over the private port). */
export type PortMessage =
  | { type: 'connected' }
  | ({ id: string; type: 'response' } & BridgeResponse)
  | { type: 'event'; event: WalletEvent; data: unknown };

/**
 * Handshake on `window`. The two scripts are injected in no guaranteed order,
 * so the bridge announces `ready` and the relay (re)sends `connect` with a
 * fresh port until the bridge acknowledges it over that port.
 */
export type WindowHandshake =
  | { channel: typeof CHANNEL; type: 'ready' }
  | { channel: typeof CHANNEL; type: 'connect' };

export const isChannelMessage = (
  value: unknown,
): value is { channel: string } =>
  typeof value === 'object' &&
  value !== null &&
  (value as { channel?: unknown }).channel === CHANNEL;

export const toBridgeError = (error: unknown): BridgeError => {
  if (typeof error === 'object' && error !== null) {
    const { code, message, data } = error as Partial<BridgeError>;

    return {
      code: typeof code === 'number' ? code : undefined,
      message: typeof message === 'string' ? message : String(error),
      data,
    };
  }

  return { message: String(error) };
};

export const bytesToBase64 = (bytes: Uint8Array) => {
  let binary = '';

  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });

  return btoa(binary);
};

export const base64ToBytes = (base64: string) =>
  Uint8Array.from(atob(base64), (char) => char.charCodeAt(0));
