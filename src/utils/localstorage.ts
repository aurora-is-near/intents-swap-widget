import { logger } from '@/logger';

type LocalStorage = {
  verifiedWallets: string[];
  nearWalletsPk: Record<string, string>;
};

const defaultValues: LocalStorage = {
  verifiedWallets: [],
  nearWalletsPk: {},
};

const getItem = <T extends keyof LocalStorage>(key: T): LocalStorage[T] => {
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
  try {
    if (
      typeof value === 'string' ||
      typeof value === 'number' ||
      typeof value === 'boolean'
    ) {
      window.localStorage.setItem(key, `${value}`);
    } else {
      window.localStorage.setItem(key, JSON.stringify(value));
    }
  } catch (error) {
    logger.warn(`[WIDGET] Failed to set ${key} in localStorage:`, error);
  }
};

const removeItem = (key: keyof LocalStorage) => {
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
