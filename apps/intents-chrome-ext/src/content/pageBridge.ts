/**
 * MAIN-world content script: the only context that can see the page's
 * injected wallets. It never initiates anything — it answers the relay over a
 * private MessagePort, using whichever wallet the site is connected to.
 */
import { CHANNEL, isChannelMessage, toBridgeError } from '../shared/bridge';
import type {
  PortMessage,
  PortRequest,
  WalletEvent,
  WalletInfo,
  WalletState,
  WindowHandshake,
} from '../shared/bridge';

type Eip1193 = {
  request: (args: { method: string; params?: unknown }) => Promise<unknown>;
  on?: (event: string, listener: (data: unknown) => void) => void;
  removeListener?: (event: string, listener: (data: unknown) => void) => void;
};

type AnnouncedProvider = {
  info: WalletInfo & { uuid: string };
  provider: Eip1193;
};

type ActiveWallet = { info: WalletInfo; provider: Eip1193 };

const EVENTS: WalletEvent[] = ['accountsChanged', 'chainChanged'];

// EIP-6963: every compliant wallet announces itself; re-announces on request.
const announced = new Map<string, AnnouncedProvider>();

window.addEventListener('eip6963:announceProvider', (event) => {
  const { detail } = event as CustomEvent<AnnouncedProvider>;

  if (detail?.info?.uuid && detail.provider) {
    announced.set(detail.info.uuid, detail);
  }
});

const requestProviders = () =>
  window.dispatchEvent(new Event('eip6963:requestProvider'));

requestProviders();

let port: MessagePort | null = null;
let active: ActiveWallet | null = null;
const listeners = new Map<WalletEvent, (data: unknown) => void>();

const post = (message: PortMessage) => port?.postMessage(message);

const candidates = (): ActiveWallet[] => {
  const list: ActiveWallet[] = [...announced.values()].map(
    ({ info, provider }) => ({
      info: { name: info.name, icon: info.icon, rdns: info.rdns },
      provider,
    }),
  );

  // Pre-6963 wallets only expose the legacy global.
  const legacy = (window as { ethereum?: Eip1193 }).ethereum;

  if (legacy && !list.some((c) => c.provider === legacy)) {
    list.push({ info: { name: 'Browser wallet' }, provider: legacy });
  }

  return list;
};

const readAccounts = async (provider: Eip1193) => {
  try {
    const accounts = await provider.request({ method: 'eth_accounts' });

    return Array.isArray(accounts) ? (accounts as string[]) : [];
  } catch {
    return [];
  }
};

const setActive = (next: ActiveWallet | null) => {
  if (active?.provider === next?.provider) {
    active = next;

    return;
  }

  listeners.forEach((listener, event) =>
    active?.provider.removeListener?.(event, listener),
  );
  listeners.clear();
  active = next;

  EVENTS.forEach((event) => {
    const listener = (data: unknown) => post({ type: 'event', event, data });

    listeners.set(event, listener);
    next?.provider.on?.(event, listener);
  });
};

/**
 * The wallet the site is connected to is the one that already exposes an
 * account to this origin — `eth_accounts` never prompts.
 */
const resolveWallet = async (): Promise<WalletState> => {
  requestProviders();

  const list = candidates();
  const accountsPerWallet = await Promise.all(
    list.map((candidate) => readAccounts(candidate.provider)),
  );

  const index = accountsPerWallet.findIndex((accounts) => accounts.length > 0);
  const candidate = list[index];
  const accounts = accountsPerWallet[index];

  if (!candidate || !accounts) {
    setActive(null);

    return { wallet: null, accounts: [], chainId: null };
  }

  setActive(candidate);

  let chainId: string | null = null;

  try {
    chainId = (await candidate.provider.request({
      method: 'eth_chainId',
    })) as string;
  } catch {
    // Some wallets refuse while locked; the panel treats it as unknown.
  }

  return { wallet: candidate.info, accounts, chainId };
};

const handle = async (message: PortRequest) => {
  try {
    if (message.type === 'ping') {
      post({
        id: message.id,
        type: 'response',
        ok: true,
        result: await resolveWallet(),
      });

      return;
    }

    if (!active) {
      await resolveWallet();
    }

    if (!active) {
      throw Object.assign(new Error('No wallet is connected on this page'), {
        code: 4900,
      });
    }

    const result = await active.provider.request({
      method: message.method,
      params: message.params,
    });

    post({ id: message.id, type: 'response', ok: true, result });
  } catch (error) {
    post({
      id: message.id,
      type: 'response',
      ok: false,
      error: toBridgeError(error),
    });
  }
};

// Accept exactly one port: the relay's, delivered before page scripts run.
const onHandshake = (event: MessageEvent) => {
  if (
    event.source !== window ||
    port !== null ||
    !isChannelMessage(event.data) ||
    (event.data as { type?: string }).type !== 'connect' ||
    !event.ports[0]
  ) {
    return;
  }

  const received = event.ports[0];

  received.onmessage = (portEvent: MessageEvent<PortRequest>) => {
    void handle(portEvent.data);
  };

  port = received;
  post({ type: 'connected' });
  window.removeEventListener('message', onHandshake);
};

window.addEventListener('message', onHandshake);
window.postMessage(
  { channel: CHANNEL, type: 'ready' } satisfies WindowHandshake,
  '*',
);
