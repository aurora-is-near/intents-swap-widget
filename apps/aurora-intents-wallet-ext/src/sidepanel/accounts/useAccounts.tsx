import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from 'react';
import type { PropsWithChildren } from 'react';

import type { Account, AccountsState, SecondaryWallet } from './types';

const STORAGE_KEY = 'accounts';

const EMPTY: AccountsState = { accounts: [], activeId: null };

const read = async (): Promise<AccountsState> => {
  const stored = await chrome.storage.local.get(STORAGE_KEY);

  return (stored[STORAGE_KEY] as AccountsState | undefined) ?? EMPTY;
};

const write = (state: AccountsState) =>
  chrome.storage.local.set({ [STORAGE_KEY]: state });

const sameWallet = (
  a: { family: string; address: string },
  b: { family: string; address: string },
) =>
  a.family === b.family && a.address.toLowerCase() === b.address.toLowerCase();

/** Thrown when a secondary wallet is the account's own wallet. */
export class OwnWalletError extends Error {
  constructor(accountName: string) {
    super(`This is ${accountName}’s own wallet.`);
    this.name = 'OwnWalletError';
  }
}

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

  /**
   * Adds the account and makes it the active one. A wallet account that is
   * already added (same family and address) is made active instead.
   */
  const add = useCallback(async (account: Account) => {
    const current = await read();
    const existing =
      account.kind === 'wallet'
        ? current.accounts.find(
            (item) => item.kind === 'wallet' && sameWallet(item, account),
          )
        : undefined;

    await write(
      existing
        ? { ...current, activeId: existing.id }
        : {
            ...current,
            accounts: [...current.accounts, account],
            activeId: account.id,
          },
    );

    return existing ?? account;
  }, []);

  const setActive = useCallback(async (id: string) => {
    const current = await read();

    if (current.accounts.some((account) => account.id === id)) {
      await write({ ...current, activeId: id });
    }
  }, []);

  const rename = useCallback(async (id: string, name: string) => {
    const current = await read();

    await write({
      ...current,
      accounts: current.accounts.map((account) =>
        account.id === id ? { ...account, name } : account,
      ),
    });
  }, []);

  /**
   * Removes the account and its secondary wallets; the next account becomes
   * active if it was active.
   */
  const remove = useCallback(async (id: string) => {
    const current = await read();
    const accounts = current.accounts.filter((account) => account.id !== id);

    await write({
      accounts,
      activeId:
        current.activeId === id ? (accounts[0]?.id ?? null) : current.activeId,
      secondaryWallets: current.secondaryWallets?.filter(
        (wallet) => wallet.primaryId !== id,
      ),
    });
  }, []);

  /**
   * Attaches a secondary wallet to its primary. One the primary already has
   * (same family and address) is returned instead; the primary's own wallet
   * is refused.
   */
  const addSecondary = useCallback(async (wallet: SecondaryWallet) => {
    const current = await read();
    const primary = current.accounts.find(
      (account) => account.id === wallet.primaryId,
    );

    if (!primary) {
      throw new Error('The account this wallet belongs to no longer exists');
    }

    if (primary.kind === 'wallet' && sameWallet(primary, wallet)) {
      throw new OwnWalletError(primary.name);
    }

    const existing = current.secondaryWallets?.find(
      (item) => item.primaryId === wallet.primaryId && sameWallet(item, wallet),
    );

    if (!existing) {
      await write({
        ...current,
        secondaryWallets: [...(current.secondaryWallets ?? []), wallet],
      });
    }

    return existing ?? wallet;
  }, []);

  const renameSecondary = useCallback(async (id: string, name: string) => {
    const current = await read();

    await write({
      ...current,
      secondaryWallets: current.secondaryWallets?.map((wallet) =>
        wallet.id === id ? { ...wallet, name } : wallet,
      ),
    });
  }, []);

  const removeSecondary = useCallback(async (id: string) => {
    const current = await read();

    await write({
      ...current,
      secondaryWallets: current.secondaryWallets?.filter(
        (wallet) => wallet.id !== id,
      ),
    });
  }, []);

  const active =
    state.accounts.find((account) => account.id === state.activeId) ??
    state.accounts[0] ??
    null;

  /** The active account's secondary wallets, oldest first. */
  const secondaries = (state.secondaryWallets ?? [])
    .filter((wallet) => wallet.primaryId === active?.id)
    .sort((a, b) => a.createdAt - b.createdAt);

  return {
    ...state,
    active,
    secondaries,
    isLoaded,
    add,
    setActive,
    rename,
    remove,
    addSecondary,
    renameSecondary,
    removeSecondary,
  };
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

/** Default name for a secondary wallet: the wallet's, numbered when taken. */
export const nextSecondaryName = (
  secondaries: readonly SecondaryWallet[],
  walletName: string,
) => {
  const taken = new Set(secondaries.map((wallet) => wallet.name));

  if (!taken.has(walletName)) {
    return walletName;
  }

  let index = 2;

  while (taken.has(`${walletName} ${index}`)) {
    index += 1;
  }

  return `${walletName} ${index}`;
};
