/**
 * Isolated-world content script: translates between the extension's messaging
 * (side panel) and the page bridge's private MessagePort. It enforces the
 * method allowlist, so the panel can never ask the page wallet for more than
 * the deposit flow needs.
 */
import { ALLOWED_METHODS, CHANNEL, isChannelMessage } from '../shared/bridge';
import type {
  BridgeResponse,
  PanelEvent,
  PanelMessage,
  PortMessage,
  PortRequest,
  WindowHandshake,
} from '../shared/bridge';

/** A ping that outlives this is a page without a bridge (or a stuck one). */
const PING_TIMEOUT_MS = 1500;

type Pending = (response: BridgeResponse) => void;

let port: MessagePort | null = null;
let connected = false;
const pending = new Map<string, Pending>();

const onPortMessage = (event: MessageEvent<PortMessage>) => {
  const message = event.data;

  if (message.type === 'connected') {
    connected = true;

    return;
  }

  if (message.type === 'event') {
    chrome.runtime
      .sendMessage({
        channel: CHANNEL,
        type: 'event',
        event: message.event,
        data: message.data,
      } satisfies PanelEvent)
      // No panel open — nobody to tell.
      .catch(() => undefined);

    return;
  }

  const resolve = pending.get(message.id);

  pending.delete(message.id);
  resolve?.(message.ok ? message : { ok: false, error: message.error });
};

const connect = () => {
  if (connected) {
    return;
  }

  const channel = new MessageChannel();

  port?.close();
  port = channel.port1;
  port.onmessage = onPortMessage;
  window.postMessage(
    { channel: CHANNEL, type: 'connect' } satisfies WindowHandshake,
    '*',
    [channel.port2],
  );
};

// The bridge announces itself if it loaded after us.
window.addEventListener('message', (event) => {
  if (
    event.source === window &&
    isChannelMessage(event.data) &&
    (event.data as { type?: string }).type === 'ready'
  ) {
    connect();
  }
});

connect();

const send = (request: PortRequest, timeoutMs?: number) =>
  new Promise<BridgeResponse>((resolve) => {
    if (!port || !connected) {
      resolve({
        ok: false,
        error: { message: 'Page bridge is not connected' },
      });

      return;
    }

    pending.set(request.id, resolve);
    port.postMessage(request);

    if (timeoutMs) {
      setTimeout(() => {
        if (pending.delete(request.id)) {
          resolve({ ok: false, error: { message: 'Page bridge timed out' } });
        }
      }, timeoutMs);
    }
  });

chrome.runtime.onMessage.addListener(
  (
    message: unknown,
    sender,
    sendResponse: (response: BridgeResponse) => void,
  ) => {
    if (sender.id !== chrome.runtime.id || !isChannelMessage(message)) {
      return false;
    }

    const msg = message as PanelMessage;
    const id = crypto.randomUUID();

    if (msg.type === 'ping') {
      void send({ id, type: 'ping' }, PING_TIMEOUT_MS).then(sendResponse);

      return true;
    }

    if (msg.type === 'request') {
      if (!ALLOWED_METHODS.has(msg.method)) {
        sendResponse({
          ok: false,
          error: { code: 4200, message: `Method not allowed: ${msg.method}` },
        });

        return false;
      }

      // No timeout: a signature prompt waits on the user.
      void send({
        id,
        type: 'request',
        method: msg.method,
        params: msg.params,
      }).then(sendResponse);

      return true;
    }

    return false;
  },
);
