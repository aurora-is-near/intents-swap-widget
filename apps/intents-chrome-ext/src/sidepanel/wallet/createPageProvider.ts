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
 * An EIP-1193 provider whose requests are served by the wallet the given tab
 * is connected to. Prompts open against the page's origin, as if the site had
 * asked.
 */
export const createPageProvider = (tabId: number): Eip1193Provider => ({
  request: ({ method, params }) =>
    sendToTab(tabId, { channel: CHANNEL, type: 'request', method, params }),
});
