/**
 * MAIN-world content script: the only context that can see the page's
 * injected wallets. It never initiates anything — it answers the relay over a
 * private MessagePort, reporting every wallet it finds (EVM via EIP-6963,
 * Solana via ./solanaWallets, NEAR via ./nearWallets) and relaying requests
 * to the one each names.
 */
import { CHANNEL, isChannelMessage, toBridgeError } from '../shared/bridge';
import type {
  EvmWalletEntry,
  PortMessage,
  PortRequest,
  WalletEvent,
  WalletInfo,
  WalletState,
  WindowHandshake,
} from '../shared/bridge';
import {
  getNearWallets,
  handleNearRequest,
  initNearWallets,
  isNearMethod,
} from './nearWallets';
import {
  getSolanaWallets,
  handleSolanaRequest,
  initSolanaWallets,
  isSolanaMethod,
} from './solanaWallets';

type Eip1193 = {
  request: (args: { method: string; params?: unknown }) => Promise<unknown>;
  on?: (event: string, listener: (data: unknown) => void) => void;
};

type AnnouncedProvider = {
  info: WalletInfo & { uuid: string };
  provider: Eip1193;
};

type EvmWallet = { id: string; info: WalletInfo; provider: Eip1193 };

const EVENTS: WalletEvent[] = ['accountsChanged', 'chainChanged'];

const LEGACY_ID = 'legacy';

/**
 * Per-wallet budget for the silent reads. One installed wallet that never
 * answers (locked, asleep, broken) must not stall detection of the others.
 */
const READ_TIMEOUT_MS = 2000;

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
const subscribed = new WeakSet<Eip1193>();

const post = (message: PortMessage) => port?.postMessage(message);

initSolanaWallets(() =>
  post({ type: 'event', event: 'solanaChanged', data: null }),
);
initNearWallets();

const evmWallets = (): EvmWallet[] => {
  const list: EvmWallet[] = [...announced.values()].map(
    ({ info, provider }) => ({
      // rdns survives reloads; the 6963 uuid is per page session.
      id: info.rdns ?? info.uuid,
      info: { name: info.name, icon: info.icon, rdns: info.rdns },
      provider,
    }),
  );

  // Pre-6963 wallets only expose the legacy global. With any 6963 wallet
  // present, the global is one of them behind a proxy — listing it again would
  // show a phantom duplicate.
  const legacy = (window as { ethereum?: Eip1193 }).ethereum;

  if (legacy && list.length === 0) {
    list.push({
      id: LEGACY_ID,
      info: { name: 'Browser wallet' },
      provider: legacy,
    });
  }

  return list;
};

const withTimeout = <T>(promise: Promise<T>) =>
  Promise.race([
    promise,
    new Promise<never>((_, reject) => {
      setTimeout(
        () => reject(new Error('Wallet did not respond')),
        READ_TIMEOUT_MS,
      );
    }),
  ]);

// `eth_accounts` / `eth_chainId` never prompt.
const readEntry = async (wallet: EvmWallet): Promise<EvmWalletEntry> => {
  let accounts: string[] = [];
  let chainId: string | null = null;

  try {
    const result = await withTimeout(
      wallet.provider.request({ method: 'eth_accounts' }),
    );

    accounts = Array.isArray(result) ? (result as string[]) : [];

    if (accounts.length > 0) {
      chainId = (await withTimeout(
        wallet.provider.request({ method: 'eth_chainId' }),
      )) as string;
    }
  } catch {
    // Locked or unresponsive: listed, but with nothing shared yet.
  }

  return { id: wallet.id, info: wallet.info, accounts, chainId };
};

const subscribe = (wallet: EvmWallet) => {
  if (subscribed.has(wallet.provider)) {
    return;
  }

  subscribed.add(wallet.provider);
  EVENTS.forEach((event) =>
    wallet.provider.on?.(event, (data) => post({ type: 'event', event, data })),
  );
};

type WagmiConnection = {
  accounts?: string[];
  connector?: { id?: string };
};

type WagmiStore = {
  state?: {
    current?: string | null;
    connections?: { value?: [string, WagmiConnection][] };
  };
};

/**
 * The session a wagmi-based site persisted (Polymarket keeps it under a
 * custom prefix, e.g. `polymarket.cache.wagmi.v2.store`). `undefined`: no
 * wagmi store on this site; `null`: the site is signed out.
 */
const readWagmiSession = (): WagmiConnection | null | undefined => {
  let found: WagmiConnection | null | undefined;

  try {
    Object.keys(window.localStorage)
      .filter((key) => /wagmi.*\.store$/i.test(key))
      .forEach((key) => {
        const { state } = JSON.parse(
          window.localStorage.getItem(key) ?? '{}',
        ) as WagmiStore;

        const current = state?.connections?.value?.find(
          ([uid]) => uid === state.current,
        )?.[1];

        found = current ?? found ?? null;
      });
  } catch {
    // Unreadable store, or storage is blocked: treat as not a wagmi site.
    return undefined;
  }

  return found;
};

/**
 * The EVM wallet the site is signed in with. Several wallets may share
 * accounts with the site's origin (old authorizations, login SDKs silently
 * reconnecting trusted wallets), so on wagmi sites the persisted session
 * decides: its account, else its connector id (the wallet's rdns). Sites
 * without one fall back to the first wallet sharing an account.
 */
const siteWalletId = (entries: EvmWalletEntry[]) => {
  const connected = entries.filter((entry) => entry.accounts.length > 0);
  const session = readWagmiSession();

  if (session === undefined) {
    return connected[0]?.id ?? null;
  }

  const account = session?.accounts?.[0]?.toLowerCase();
  const byAccount = account
    ? connected.find((entry) =>
        entry.accounts.some((address) => address.toLowerCase() === account),
      )
    : undefined;

  return (
    byAccount?.id ??
    connected.find((entry) => entry.id === session?.connector?.id)?.id ??
    null
  );
};

const resolveWallets = async (): Promise<WalletState> => {
  requestProviders();

  const wallets = evmWallets();

  wallets.forEach(subscribe);

  const evm = await Promise.all(wallets.map(readEntry));

  return {
    evm,
    siteEvmWallet: siteWalletId(evm),
    solana: getSolanaWallets(),
    near: getNearWallets(),
  };
};

const handle = async (message: PortRequest) => {
  try {
    if (message.type === 'ping') {
      post({
        id: message.id,
        type: 'response',
        ok: true,
        result: await resolveWallets(),
      });

      return;
    }

    if (isNearMethod(message.method)) {
      post({
        id: message.id,
        type: 'response',
        ok: true,
        result: await handleNearRequest(message.method, message.params),
      });

      return;
    }

    if (isSolanaMethod(message.method)) {
      post({
        id: message.id,
        type: 'response',
        ok: true,
        result: await handleSolanaRequest(message.method, message.params),
      });

      return;
    }

    const wallet = evmWallets().find((entry) => entry.id === message.wallet);

    if (!wallet) {
      throw Object.assign(new Error('That EVM wallet is not available'), {
        code: 4900,
      });
    }

    const result = await wallet.provider.request({
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
