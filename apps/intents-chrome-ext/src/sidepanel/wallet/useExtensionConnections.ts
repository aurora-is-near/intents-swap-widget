import { useCallback, useEffect, useState } from 'react';

const STORAGE_KEY = 'extensionWallets';

/**
 * The account a wallet shared. `publicKey` is kept for signers identified by
 * account + key (NEAR), which the service needs to resolve them.
 */
export type ExtensionAccount = { address: string; publicKey?: string };

/** Wallet id (`evm:<rdns>` / `sol:<name>` / `near:<id>`) → its account. */
export type ExtensionConnections = Record<string, ExtensionAccount>;

type StoredConnections = Record<string, ExtensionAccount | string>;

// Entries were plain address strings before public keys were stored.
const normalize = (raw: StoredConnections | undefined): ExtensionConnections =>
  Object.fromEntries(
    Object.entries(raw ?? {}).map(([id, value]) => [
      id,
      typeof value === 'string' ? { address: value } : value,
    ]),
  );

const read = async (): Promise<ExtensionConnections> => {
  try {
    const stored = await chrome.storage.local.get(STORAGE_KEY);

    return normalize(stored[STORAGE_KEY] as StoredConnections | undefined);
  } catch {
    return {};
  }
};

/**
 * Wallets the user connected to the extension (through the connector page),
 * remembered across panel opens. The wallets themselves remember the
 * connector origin, so reusing one later needs no new approval.
 */
export const useExtensionConnections = () => {
  const [connections, setConnections] = useState<ExtensionConnections>({});

  useEffect(() => {
    void read().then(setConnections);

    const onChanged = (
      changes: Record<string, chrome.storage.StorageChange>,
    ) => {
      if (STORAGE_KEY in changes) {
        setConnections(
          normalize(
            changes[STORAGE_KEY]?.newValue as StoredConnections | undefined,
          ),
        );
      }
    };

    chrome.storage.local.onChanged.addListener(onChanged);

    return () => chrome.storage.local.onChanged.removeListener(onChanged);
  }, []);

  const remember = useCallback(
    async (walletId: string, account: ExtensionAccount) => {
      const next = { ...(await read()), [walletId]: account };

      await chrome.storage.local.set({ [STORAGE_KEY]: next });
      setConnections(next);
    },
    [],
  );

  const forget = useCallback(async (walletId: string) => {
    const { [walletId]: _removed, ...next } = await read();

    await chrome.storage.local.set({ [STORAGE_KEY]: next });
    setConnections(next);
  }, []);

  return { connections, remember, forget };
};
