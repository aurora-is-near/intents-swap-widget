type LocalStorageKeys =
  | 'sw.verifiedWallets'
  | 'sw.verifiedNearAccounts'
  | 'sw.nearWalletsPk';

const defaultStoreValues: Record<LocalStorageKeys, string> = {
  'sw.verifiedWallets': JSON.stringify([]),
  'sw.verifiedNearAccounts': JSON.stringify([]),
  'sw.nearWalletsPk': JSON.stringify({}),
};

export const mockedLocalStorage = (() => {
  let store: Record<LocalStorageKeys, string> = defaultStoreValues;

  return {
    getItem: (key: LocalStorageKeys) => store[key] || null,
    setItem: (key: LocalStorageKeys, value: string) => {
      store[key] = value;
    },
    removeItem: (key: LocalStorageKeys) => {
      delete store[key];
    },
    clear: () => {
      store = defaultStoreValues;
    },
  };
})();

Object.defineProperty(globalThis, 'localStorage', {
  value: mockedLocalStorage,
  writable: true,
});
