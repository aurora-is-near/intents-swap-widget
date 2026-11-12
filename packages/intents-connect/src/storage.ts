/**
 * Where the SDK persists small string values (sessions, verified wallets).
 * Sync or async, so a secure store (e.g. an extension's `chrome.storage`) can
 * back it as easily as `localStorage`.
 */
export type KeyValueStorage = {
  get: (
    key: string,
  ) => string | null | undefined | Promise<string | null | undefined>;
  set: (key: string, value: string) => void | Promise<void>;
  remove: (key: string) => void | Promise<void>;
};

/** Lives as long as the page. The default for user sessions. */
export const memoryStorage = (): KeyValueStorage => {
  const values = new Map<string, string>();

  return {
    get: (key) => values.get(key),
    set: (key, value) => {
      values.set(key, value);
    },
    remove: (key) => {
      values.delete(key);
    },
  };
};

type WebStorageLike = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;

/**
 * Wraps `localStorage` / `sessionStorage`. Every call is guarded: storage can
 * be absent (SSR), blocked (privacy settings) or full, and none of those may
 * break the SDK — a failed write just means the value is not remembered.
 */
export const webStorage = (
  storage: WebStorageLike | null | undefined,
  { prefix = '' }: { prefix?: string } = {},
): KeyValueStorage => ({
  get: (key) => {
    try {
      return storage?.getItem(prefix + key) ?? null;
    } catch {
      return null;
    }
  },
  set: (key, value) => {
    try {
      storage?.setItem(prefix + key, value);
    } catch {
      // Not remembered; nothing else to do.
    }
  },
  remove: (key) => {
    try {
      storage?.removeItem(prefix + key);
    } catch {
      // Nothing to remove, or not allowed to.
    }
  },
});

/**
 * The browser's `localStorage`, or `undefined` when there is none (SSR) or it
 * cannot be touched (sandboxed iframes throw on access).
 */
export const getLocalStorage = (): WebStorageLike | undefined => {
  try {
    return typeof window === 'undefined' ? undefined : window.localStorage;
  } catch {
    return undefined;
  }
};
