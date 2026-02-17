import { useCallback, useEffect, useRef, useState } from 'react';
import { NearConnector } from '@hot-labs/near-connect';
import type { NearWalletBase } from '@hot-labs/near-connect/build/types/wallet';

type NearWalletState = {
  isConnected: boolean;
  accountId: string | undefined;
  nearBasedWallet: NearWalletBase | undefined;
  connect: () => Promise<void>;
  disconnect: () => Promise<void>;
};

export const useNearWallet = (): NearWalletState => {
  const connectorRef = useRef<NearConnector | null>(null);
  const [accountId, setAccountId] = useState<string | undefined>();
  const [nearBasedWallet, setNearBasedWallet] = useState<
    NearWalletBase | undefined
  >();

  useEffect(() => {
    let cancelled = false;

    const init = async () => {
      if (cancelled) return;

      const connector = new NearConnector();
      connectorRef.current = connector;

      connector.on('wallet:signIn', ({ wallet, accounts }) => {
        if (cancelled) return;
        setNearBasedWallet(wallet);
        setAccountId(accounts[0]?.accountId);
      });

      connector.on('wallet:signOut', () => {
        if (cancelled) return;
        setNearBasedWallet(undefined);
        setAccountId(undefined);
      });

      // Restore existing session
      try {
        const wallet = await connector.wallet();
        if (cancelled) return;
        const accounts = await wallet.getAccounts();
        if (cancelled) return;
        if (accounts.length > 0) {
          setNearBasedWallet(wallet);
          setAccountId(accounts[0].accountId);
        }
      } catch {
        // No existing session — nothing to restore
      }
    };

    init();

    return () => {
      cancelled = true;
    };
  }, []);

  const connect = useCallback(async () => {
    const connector = connectorRef.current;
    if (!connector) return;

    await connector.connect();
  }, []);

  const disconnect = useCallback(async () => {
    const connector = connectorRef.current;
    if (!connector) return;

    await connector.disconnect();
    setNearBasedWallet(undefined);
    setAccountId(undefined);
  }, []);

  return {
    isConnected: !!accountId,
    accountId,
    nearBasedWallet,
    connect,
    disconnect,
  };
};
