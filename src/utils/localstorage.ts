import { logger } from '@/logger';

type LocalStorage = {
  verifiedWallets: string[];
  nearWalletsPk: Record<string, string>;
};

const defaultValues: LocalStorage = {
  verifiedWallets: [],
  nearWalletsPk: {},
};

const isBrowser = typeof window !== 'undefined' && !!window.localStorage;

const getItem = <T extends keyof LocalStorage>(key: T): LocalStorage[T] => {
  if (!isBrowser) {
    if (process.env.NODE_ENV === 'development') {
      logger.debug(
        `[WIDGET] Attempted to read ${key} on server; returning default`,
      );
    }

    return defaultValues[key];
  }

  try {
    return (
      // @ts-expect-error It's ok to pass null to JSON.parse
      (JSON.parse(window.localStorage.getItem(key)) as LocalStorage[T]) ??
      defaultValues[key]
    );
  } catch (error) {
    logger.warn(`[WIDGET] Failed to parse ${key} from localStorage:`, error);

    return defaultValues[key];
  }
};

const setItem = <T extends keyof LocalStorage>(
  key: T,
  value: LocalStorage[T],
) => {
  if (!isBrowser) {
    if (process.env.NODE_ENV === 'development') {
      logger.debug(`[WIDGET] Attempted to set ${key} on server; skipping`);
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

    window.localStorage.setItem(key, serialized);
  } catch (error) {
    logger.warn(`[WIDGET] Failed to set ${key} in localStorage:`, error);
  }
};

const removeItem = (key: keyof LocalStorage) => {
  if (!isBrowser) {
    if (process.env.NODE_ENV === 'development') {
      logger.debug(`[WIDGET] Attempted to remove ${key} on server; skipping`);
    }

    return;
  }

  try {
    window.localStorage.removeItem(key);
  } catch (error) {
    logger.warn(`[WIDGET] Failed to remove ${key} from localStorage:`, error);
  }
};

export const localStorageTyped = {
  getItem,
  setItem,
  removeItem,
};
