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

/**
 * A ping that outlives this is a stuck bridge. Covers two sequential wallet
 * reads (see READ_TIMEOUT_MS in pageBridge) plus a waking wallet worker.
 */
const PING_TIMEOUT_MS = 5000;

type Pending = (response: BridgeResponse) => void;

/** The port the bridge acknowledged; `null` until the handshake completes. */
let port: MessagePort | null = null;
let connected = false;
const pending = new Map<string, Pending>();

/**
 * Every port offered but not yet acknowledged. A `ready` can arrive after our
 * first offer was already accepted (both are queued tasks), so earlier offers
 * must stay open — the bridge takes whichever arrives first and ignores the
 * rest. The losers are closed once one is acknowledged.
 */
const offered = new Set<MessagePort>();

const onPortMessage = (
  source: MessagePort,
  event: MessageEvent<PortMessage>,
) => {
  const message = event.data;

  if (message.type === 'connected') {
    connected = true;
    port = source;
    offered.forEach((candidate) => candidate !== source && candidate.close());
    offered.clear();

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
  const offer = channel.port1;

  offer.onmessage = (event: MessageEvent<PortMessage>) =>
    onPortMessage(offer, event);
  offered.add(offer);
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
        wallet: msg.wallet,
        method: msg.method,
        params: msg.params,
      }).then(sendResponse);

      return true;
    }

    return false;
  },
);
