import { createEvmSource } from '@/detect/evm';
import { createNearSource } from '@/detect/near';
import { createSolanaSource } from '@/detect/solana';
import type {
  DetectedFamily,
  DetectedWallet,
  WalletDetector,
  WalletDetectorOptions,
  WalletDetectorSnapshot,
} from '@/detect/types';

const EMPTY: WalletDetectorSnapshot = Object.freeze({
  ready: false,
  wallets: Object.freeze([]) as readonly DetectedWallet[],
});

const DEFAULT_FAMILIES: readonly DetectedFamily[] = ['evm', 'sol', 'near'];

/** Lets wallets that announce in the same tick land in one pass. */
const SETTLE_MS = 50;

const describe = (wallet: DetectedWallet) =>
  [
    wallet.id,
    wallet.name,
    wallet.address,
    wallet.family === 'evm' ? wallet.chainId : '',
    wallet.family === 'near' ? wallet.publicKey : '',
  ].join('|');

const sameWallets = (
  a: readonly DetectedWallet[],
  b: readonly DetectedWallet[],
) =>
  a.length === b.length &&
  a.every(
    (wallet, index) =>
      describe(wallet) === describe(b[index]) &&
      // A re-announced wallet can bring a new provider object.
      (wallet.family === 'evm'
        ? wallet.provider === (b[index] as typeof wallet).provider
        : wallet.wallet === (b[index] as typeof wallet).wallet),
  );

/**
 * Finds wallets injected into this page and the accounts they already share
 * with the site — without ever prompting.
 *
 * - EVM: EIP-6963 announcements (the legacy `window.ethereum` only when none
 *   announce), read with `eth_accounts` / `eth_chainId`.
 * - Solana: the Wallet Standard (`solana:mainnet` wallets that can sign).
 * - NEAR: near-connect's injected extension wallets, read with `getAccounts`.
 *
 * SSR-safe: without `window` it reports no wallets and attaches nothing.
 * Call `destroy()` when done — every listener it attached is removed.
 */
export const createWalletDetector = (
  options: WalletDetectorOptions = {},
): WalletDetector => {
  if (typeof window === 'undefined') {
    return {
      getSnapshot: () => EMPTY,
      subscribe: () => () => undefined,
      refresh: () => Promise.resolve(),
      destroy: () => undefined,
    };
  }

  const {
    families = DEFAULT_FAMILIES,
    readTimeoutMs = 2000,
    silentSolanaConnect = false,
  } = options;

  let snapshot = EMPTY;
  let destroyed = false;
  let running: Promise<void> | undefined;
  let rerun = false;
  let timer: ReturnType<typeof setTimeout> | undefined;
  const listeners = new Set<() => void>();

  const notify = () => listeners.forEach((listener) => listener());

  type Source = {
    start: () => void;
    read: () => Promise<DetectedWallet[]>;
    stop: () => void;
  };

  // Filled below, once the refresh it triggers exists.
  const sources: Source[] = [];

  const pass = async () => {
    const results = await Promise.all(sources.map((source) => source.read()));

    if (destroyed) {
      return;
    }

    const wallets = results.flat();

    if (!snapshot.ready || !sameWallets(snapshot.wallets, wallets)) {
      snapshot = Object.freeze({
        ready: true,
        wallets: Object.freeze(wallets),
      });
      notify();
    }
  };

  const refresh = (): Promise<void> => {
    if (destroyed) {
      return Promise.resolve();
    }

    if (running) {
      rerun = true;

      return running;
    }

    running = pass().finally(() => {
      running = undefined;

      if (rerun && !destroyed) {
        rerun = false;
        void refresh();
      }
    });

    return running;
  };

  const scheduleRefresh = () => {
    if (destroyed) {
      return;
    }

    clearTimeout(timer);
    timer = setTimeout(() => {
      void refresh();
    }, SETTLE_MS);
  };

  if (families.includes('evm')) {
    sources.push(createEvmSource(scheduleRefresh, readTimeoutMs));
  }

  if (families.includes('sol')) {
    sources.push(
      createSolanaSource(scheduleRefresh, {
        timeout: readTimeoutMs,
        silent: silentSolanaConnect,
      }),
    );
  }

  if (families.includes('near')) {
    sources.push(createNearSource(scheduleRefresh, readTimeoutMs));
  }

  sources.forEach((source) => source.start());
  scheduleRefresh();

  return {
    getSnapshot: () => snapshot,
    subscribe: (listener) => {
      listeners.add(listener);

      return () => {
        listeners.delete(listener);
      };
    },
    refresh,
    destroy: () => {
      destroyed = true;
      clearTimeout(timer);
      sources.forEach((source) => source.stop());
      listeners.clear();
    },
  };
};

/**
 * The first wallet that shares an account with the site, preferring families
 * in `prefer` order.
 */
export const pickConnectedWallet = (
  wallets: readonly DetectedWallet[],
  prefer: readonly DetectedFamily[] = DEFAULT_FAMILIES,
): DetectedWallet | undefined =>
  prefer
    .map((family) =>
      wallets.find((wallet) => wallet.family === family && wallet.address),
    )
    .find(Boolean);
