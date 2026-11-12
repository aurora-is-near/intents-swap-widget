'use client';

import { useCallback, useMemo, useSyncExternalStore } from 'react';

import { createWalletDetector } from '@/detect/detector';
import type {
  WalletDetector,
  WalletDetectorOptions,
  WalletDetectorSnapshot,
} from '@/detect/types';

const SERVER_SNAPSHOT: WalletDetectorSnapshot = Object.freeze({
  ready: false,
  wallets: Object.freeze([]),
});

type Entry = {
  detector: WalletDetector;
  users: number;
  disposeTimer?: ReturnType<typeof setTimeout>;
};

/**
 * One detector per distinct options, shared by every hook using them, so
 * window listeners are attached once however many components ask.
 */
const registry = new Map<string, Entry>();

const keyOf = (options: WalletDetectorOptions) =>
  JSON.stringify({
    families: options.families ? [...options.families].sort() : undefined,
    sources: options.sources?.map((source) => source.id).sort(),
    readTimeoutMs: options.readTimeoutMs,
  });

const acquire = (key: string, options: WalletDetectorOptions): Entry => {
  let entry = registry.get(key);

  if (!entry) {
    entry = { detector: createWalletDetector(options), users: 0 };
    registry.set(key, entry);
  }

  clearTimeout(entry.disposeTimer);
  entry.users += 1;

  return entry;
};

const release = (key: string) => {
  const entry = registry.get(key);

  if (!entry) {
    return;
  }

  entry.users -= 1;

  if (entry.users <= 0) {
    // Deferred: StrictMode unsubscribes and resubscribes immediately, and
    // tearing the detector down in between would re-detect from scratch.
    entry.disposeTimer = setTimeout(() => {
      if (entry.users <= 0) {
        entry.detector.destroy();
        registry.delete(key);
      }
    }, 0);
  }
};

export type UseDetectedWalletsResult = WalletDetectorSnapshot & {
  /** Re-reads every wallet's accounts (e.g. after the user connected one). */
  refresh: () => Promise<void>;
};

/**
 * Wallets injected into the page and the accounts they share with this site,
 * kept current as wallets announce themselves or switch accounts.
 */
export const useDetectedWallets = (
  options: WalletDetectorOptions = {},
): UseDetectedWalletsResult => {
  const key = keyOf(options);
  // `options` is only read when the key changes.
  const stableOptions = useMemo(() => options, [key]);

  const subscribe = useCallback(
    (onChange: () => void) => {
      const entry = acquire(key, stableOptions);
      const unsubscribe = entry.detector.subscribe(onChange);

      // The detector may have settled before this subscription existed.
      onChange();

      return () => {
        unsubscribe();
        release(key);
      };
    },
    [key, stableOptions],
  );

  const getSnapshot = useCallback(
    () => registry.get(key)?.detector.getSnapshot() ?? SERVER_SNAPSHOT,
    [key],
  );

  const snapshot = useSyncExternalStore(
    subscribe,
    getSnapshot,
    () => SERVER_SNAPSHOT,
  );

  const refresh = useCallback(
    () => registry.get(key)?.detector.refresh() ?? Promise.resolve(),
    [key],
  );

  return useMemo(() => ({ ...snapshot, refresh }), [snapshot, refresh]);
};
