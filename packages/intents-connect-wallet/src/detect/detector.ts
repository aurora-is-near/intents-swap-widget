import { createEvmSource } from '@/detect/evm';
import { createNearSource } from '@/detect/near';
import { getRememberedConnection } from '@/detect/remembered';
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
 * - Solana: the Wallet Standard (`solana:mainnet` wallets that can sign),
 *   read from `wallet.accounts`.
 * - NEAR: near-connect's injected extension wallets.
 *
 * A Solana or NEAR wallet the user connected on this site
 * (`connectDetectedWallet`) is also restored silently; no other wallet is
 * ever called, since some open their UI even when asked not to.
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

  const { families = DEFAULT_FAMILIES, readTimeoutMs = 2000 } = options;

  let snapshot = EMPTY;
  let destroyed = false;
  let running: Promise<void> | undefined;
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
    // One family failing (a wallet's code throwing where we did not expect
    // it) must not hide the others or keep `ready` from flipping.
    const results = await Promise.allSettled(
      sources.map((source) => source.read()),
    );

    if (destroyed) {
      return;
    }

    const wallets = results.flatMap((result) =>
      result.status === 'fulfilled' ? result.value : [],
    );

    if (!snapshot.ready || !sameWallets(snapshot.wallets, wallets)) {
      snapshot = Object.freeze({
        ready: true,
        wallets: Object.freeze(wallets),
      });
      notify();
    }
  };

  let queued: Promise<void> | undefined;

  /**
   * A pass, or — while one is running — the pass queued after it, so the
   * returned promise always settles on a read that started after the call.
   */
  const refresh = (): Promise<void> => {
    if (destroyed) {
      return Promise.resolve();
    }

    if (running) {
      queued ??= running.then(() => {
        queued = undefined;

        return refresh();
      });

      return queued;
    }

    running = pass().finally(() => {
      running = undefined;
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
      createSolanaSource(scheduleRefresh, { timeout: readTimeoutMs }),
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
 * in `prefer` order. A wallet the user disconnected here
 * (`disconnectDetectedWallet`) is skipped, even if it still shares one.
 */
export const pickConnectedWallet = (
  wallets: readonly DetectedWallet[],
  prefer: readonly DetectedFamily[] = DEFAULT_FAMILIES,
): DetectedWallet | undefined =>
  prefer
    .map((family) =>
      wallets.find(
        (wallet) =>
          wallet.family === family &&
          wallet.address &&
          getRememberedConnection(wallet.id) !== 'disconnected',
      ),
    )
    .find(Boolean);
