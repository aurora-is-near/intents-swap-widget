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

export const CHANNEL = 'intents-connect-ext';

/**
 * Methods the side panel may call on the page wallet. Everything the SDK's
 * erc191 signer and the EVM deposit transfer (viem wallet client) need, plus
 * harmless reads. Anything else is refused by the relay.
 */
export const ALLOWED_METHODS = new Set([
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
]);

export type WalletInfo = {
  name: string;
  icon?: string;
  rdns?: string;
};

export type WalletState = {
  /** `null` when no injected wallet on the page has an account connected. */
  wallet: WalletInfo | null;
  accounts: string[];
  chainId: string | null;
};

export type BridgeError = { code?: number; message: string; data?: unknown };

export type BridgeResponse<T = unknown> =
  | { ok: true; result: T }
  | { ok: false; error: BridgeError };

export type WalletEvent = 'accountsChanged' | 'chainChanged';

/** Side panel → relay (`chrome.tabs.sendMessage`). */
export type PanelMessage =
  | { channel: typeof CHANNEL; type: 'ping' }
  | {
      channel: typeof CHANNEL;
      type: 'request';
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

/** Relay → page bridge (over the private port). */
export type PortRequest =
  | { id: string; type: 'ping' }
  | {
      id: string;
      type: 'request';
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
