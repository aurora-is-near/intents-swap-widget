import type { IStorage } from '@tonconnect/sdk';

const localStore = (): Storage | undefined => {
  try {
    return window.localStorage;
  } catch {
    return undefined;
  }
};

/**
 * TON Connect's storage under a prefix: its keys are fixed, so another
 * TON Connect app on the same origin would otherwise share (and clobber) the
 * session. Falls back to memory when `localStorage` is unavailable.
 */
export const prefixedStorage = (prefix: string): IStorage => {
  const memory = new Map<string, string>();
  const keyOf = (name: string) => (prefix ? `${prefix}:${name}` : name);

  return {
    setItem: async (name, value) => {
      try {
        const store = localStore();

        if (store) {
          store.setItem(keyOf(name), value);

          return;
        }
      } catch {
        // Full or blocked: kept in memory instead.
      }

      memory.set(keyOf(name), value);
    },
    getItem: async (name) => {
      try {
        return (
          localStore()?.getItem(keyOf(name)) ?? memory.get(keyOf(name)) ?? null
        );
      } catch {
        return memory.get(keyOf(name)) ?? null;
      }
    },
    removeItem: async (name) => {
      memory.delete(keyOf(name));

      try {
        localStore()?.removeItem(keyOf(name));
      } catch {
        // Nothing stored there.
      }
    },
  };
};
