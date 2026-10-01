import type { Eip1193Provider } from '@aurora-is-near/intents-connect';

import { CHANNEL } from '../../shared/bridge';
import type {
  BridgeResponse,
  PanelMessage,
  WalletState,
} from '../../shared/bridge';

export class PageBridgeError extends Error {
  code?: number;

  data?: unknown;

  constructor(message: string, code?: number, data?: unknown) {
    super(message);
    this.name = 'PageBridgeError';
    this.code = code;
    this.data = data;
  }
}

const sendToTab = async <T>(tabId: number, message: PanelMessage) => {
  let response: BridgeResponse<T> | undefined;

  try {
    response = await chrome.tabs.sendMessage(tabId, message);
  } catch {
    // No content script in the tab (opened before install, or navigated away).
    throw new PageBridgeError('Page bridge is not available in this tab');
  }

  if (!response) {
    throw new PageBridgeError('Page bridge is not available in this tab');
  }

  if (!response.ok) {
    throw new PageBridgeError(
      response.error.message,
      response.error.code,
      response.error.data,
    );
  }

  return response.result;
};

/** Which wallet the page is connected with, without prompting. */
export const pingPage = (tabId: number) =>
  sendToTab<WalletState>(tabId, { channel: CHANNEL, type: 'ping' });

/**
 * One bridge request: an EVM RPC method routed to `wallet` (an EVM wallet
 * id), or a `sol_*` bridge method (which names its wallet in `params`).
 */
export const requestPage = <T = unknown>(
  tabId: number,
  method: string,
  params?: unknown[] | object,
  wallet?: string,
) =>
  sendToTab<T>(tabId, {
    channel: CHANNEL,
    type: 'request',
    wallet,
    method,
    params,
  });

/** Resolves the tab a wallet lives in — possibly opening it first. */
export type TabResolver = () => Promise<number>;

/**
 * An EIP-1193 provider served by one EVM wallet in the tab `getTabId`
 * resolves to. Prompts open against that page's origin.
 */
export const createPageProvider = (
  getTabId: TabResolver,
  walletId: string,
): Eip1193Provider => ({
  request: async ({ method, params }) =>
    requestPage(await getTabId(), method, params, walletId),
});
