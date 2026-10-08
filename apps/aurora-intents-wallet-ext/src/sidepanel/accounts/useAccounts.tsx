import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from 'react';
import type { PropsWithChildren } from 'react';

import type { Account, AccountsState } from './types';

const STORAGE_KEY = 'accounts';

const EMPTY: AccountsState = { accounts: [], activeId: null };

const read = async (): Promise<AccountsState> => {
  const stored = await chrome.storage.local.get(STORAGE_KEY);

  return (stored[STORAGE_KEY] as AccountsState | undefined) ?? EMPTY;
};

const write = (state: AccountsState) =>
  chrome.storage.local.set({ [STORAGE_KEY]: state });

/** Accounts of this install, kept in sync across panels via storage events. */
const useAccountsStore = () => {
  const [state, setState] = useState<AccountsState>(EMPTY);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    void read().then((stored) => {
      setState(stored);
      setIsLoaded(true);
    });

    const onChanged = (
      changes: Record<string, chrome.storage.StorageChange>,
      area: string,
    ) => {
      const change = changes[STORAGE_KEY];

      if (area === 'local' && change) {
        setState((change.newValue as AccountsState | undefined) ?? EMPTY);
      }
    };

    chrome.storage.onChanged.addListener(onChanged);

    return () => chrome.storage.onChanged.removeListener(onChanged);
  }, []);

  /** Adds the account and makes it the active one. */
  const add = useCallback(async (account: Account) => {
    const current = await read();

    await write({
      accounts: [...current.accounts, account],
      activeId: account.id,
    });
  }, []);

  const setActive = useCallback(async (id: string) => {
    const current = await read();

    if (current.accounts.some((account) => account.id === id)) {
      await write({ ...current, activeId: id });
    }
  }, []);

  const active =
    state.accounts.find((account) => account.id === state.activeId) ??
    state.accounts[0] ??
    null;

  return { ...state, active, isLoaded, add, setActive };
};

type Accounts = ReturnType<typeof useAccountsStore>;

const AccountsContext = createContext<Accounts | null>(null);

export const AccountsProvider = ({ children }: PropsWithChildren) => (
  <AccountsContext.Provider value={useAccountsStore()}>
    {children}
  </AccountsContext.Provider>
);

export const useAccounts = () => {
  const accounts = useContext(AccountsContext);

  if (!accounts) {
    throw new Error('useAccounts must be used inside AccountsProvider');
  }

  return accounts;
};

/** Default name for the next account: "Account N". */
export const nextAccountName = (accounts: readonly Account[]) =>
  `Account ${accounts.length + 1}`;
