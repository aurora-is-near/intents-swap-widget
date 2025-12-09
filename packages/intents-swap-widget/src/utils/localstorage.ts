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

const getItem = <T extends keyof LocalStorage>(key: T): LocalStorage[T] => {
  if (!isBrowser) {
    if (process.env.NODE_ENV === 'development') {
      logger.debug(
        `[WIDGET] Attempted to read ${KEY_PREFIX}.${key} from localstorage on server; returning default`,
      );
    }

    return defaultValues[key];
  }

  try {
    const storedValueLegacy = window.localStorage.getItem(key);
    let storedValue = window.localStorage.getItem(`${KEY_PREFIX}.${key}`);

    // Migrate legacy key to new namespaced key
    if (storedValueLegacy && !storedValue) {
      storedValue = storedValueLegacy;
      window.localStorage.setItem(`${KEY_PREFIX}.${key}`, storedValueLegacy);
      window.localStorage.removeItem(key);
    }

    return (
      // @ts-expect-error It's ok to pass null to JSON.parse
      (JSON.parse(storedValue) as LocalStorage[T]) ?? defaultValues[key]
    );
  } catch (error) {
    logger.warn(
      `[WIDGET] Failed to parse ${KEY_PREFIX}.${key} from localStorage:`,
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
        `[WIDGET] Attempted to set ${KEY_PREFIX}.${key} on server; skipping`,
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

    window.localStorage.setItem(`${KEY_PREFIX}.${key}`, serialized);
  } catch (error) {
    logger.warn(
      `[WIDGET] Failed to set ${KEY_PREFIX}.${key} in localStorage:`,
      error,
    );
  }
};

const removeItem = (key: keyof LocalStorage) => {
  if (!isBrowser) {
    if (process.env.NODE_ENV === 'development') {
      logger.debug(
        `[WIDGET] Attempted to remove ${KEY_PREFIX}.${key} from localstorage on server; skipping`,
      );
    }

    return;
  }

  try {
    window.localStorage.removeItem(`${KEY_PREFIX}.${key}`);
  } catch (error) {
    logger.warn(
      `[WIDGET] Failed to remove ${KEY_PREFIX}.${key} from localStorage:`,
      error,
    );
  }
};

export const localStorageTyped = {
  getItem,
  setItem,
  removeItem,
};
