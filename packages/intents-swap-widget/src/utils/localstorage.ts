import { logger } from '@/logger';

type LocalStorage = {
  verifiedWallets: string[];
  verifiedNearAccounts: string[];
  nearWalletsPk: Record<string, string>;
};

const defaultValues: LocalStorage = {
  verifiedWallets: [],
  verifiedNearAccounts: [],
  nearWalletsPk: {},
};

const isBrowser = typeof window !== 'undefined' && !!window.localStorage;

const KEY_PREFIX = 'sw';
const getStorageKey = (key: string) => `${KEY_PREFIX}.${key}`;

const getItem = <T extends keyof LocalStorage>(key: T): LocalStorage[T] => {
  if (!isBrowser) {
    if (process.env.NODE_ENV === 'development') {
      logger.debug(
        `[WIDGET] Attempted to read ${getStorageKey(key)} from localstorage on server; returning default`,
      );
    }

    return defaultValues[key];
  }

  try {
    const storedValueLegacy = window.localStorage.getItem(key);
    let storedValue = window.localStorage.getItem(getStorageKey(key));

    // Migrate legacy key to new namespaced key
    if (storedValueLegacy && !storedValue) {
      storedValue = storedValueLegacy;
      window.localStorage.setItem(getStorageKey(key), storedValueLegacy);
      window.localStorage.removeItem(key);
    }

    return (
      // @ts-expect-error It's ok to pass null to JSON.parse
      (JSON.parse(storedValue) as LocalStorage[T]) ?? defaultValues[key]
    );
  } catch (error) {
    logger.warn(
      `[WIDGET] Failed to parse ${getStorageKey(key)} from localStorage:`,
      error,
    );

    return defaultValues[key];
  }
};

const setItem = <T extends keyof LocalStorage>(
  key: T,
  value: LocalStorage[T],
) => {
  if (!isBrowser) {
    if (process.env.NODE_ENV === 'development') {
      logger.debug(
        `[WIDGET] Attempted to set ${getStorageKey(key)} on server; skipping`,
      );
    }

    return;
  }

  try {
    const serialized =
      typeof value === 'string' ||
      typeof value === 'number' ||
      typeof value === 'boolean'
        ? String(value)
        : JSON.stringify(value);

    window.localStorage.setItem(getStorageKey(key), serialized);
  } catch (error) {
    logger.warn(
      `[WIDGET] Failed to set ${getStorageKey(key)} in localStorage:`,
      error,
    );
  }
};

const removeItem = (key: keyof LocalStorage) => {
  if (!isBrowser) {
    if (process.env.NODE_ENV === 'development') {
      logger.debug(
        `[WIDGET] Attempted to remove ${getStorageKey(key)} from localstorage on server; skipping`,
      );
    }

    return;
  }

  try {
    window.localStorage.removeItem(getStorageKey(key));
  } catch (error) {
    logger.warn(
      `[WIDGET] Failed to remove ${getStorageKey(key)} from localStorage:`,
      error,
    );
  }
};

export const localStorageTyped = {
  getItem,
  setItem,
  removeItem,
};
