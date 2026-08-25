import { useCallback, useContext, useState } from 'react';
import { useAppKitAccount, useDisconnect } from '@reown/appkit/react';
import { AppKitContext } from '@/connect/appkit/appkit';

type AppKitWalletConfig = {
  isConnecting: boolean;
  isConnected: boolean;
  connect: () => Promise<void> | void;
  disconnect: () => Promise<void> | void;
  address: string | undefined;
  /** e.g. `eip155:8453:0x…` or `solana:…` — names the ACTIVE namespace. */
  caipAddress: string | undefined;
};

export const useAppKitWallet = (): AppKitWalletConfig => {
  const { appKit } = useContext(AppKitContext) ?? {};
  const { address: appKitAddress, caipAddress } = useAppKitAccount();
  const { disconnect: appKitDisconnect } = useDisconnect();
  const [isConnecting, setIsConnecting] = useState(false);

  const connect = useCallback(async () => {
    if (!appKit) {
      throw new Error('AppKit is not initialized');
    }

    if (appKit.getIsConnectedState()) {
      return;
    }

    setIsConnecting(true);

    try {
      // `open()` resolves when the MODAL OPENS, not when a wallet connects —
      // so wait for the modal to close and read the connection outcome then.
      // The modal closes on both a successful connect and a dismissal.
      await appKit.open();

      await new Promise<void>((resolve, reject) => {
        const unsubscribe = appKit.subscribeState((state) => {
          if (state.open) {
            return;
          }

          unsubscribe();

          if (appKit.getIsConnectedState()) {
            resolve();
          } else {
            reject(new Error('Wallet connection was cancelled'));
          }
        });
      });
    } finally {
      setIsConnecting(false);
    }
  }, [appKit]);

  const disconnect = useCallback(async () => {
    await appKitDisconnect({ namespace: 'solana' });
    await appKitDisconnect({ namespace: 'eip155' });
  }, [appKitDisconnect]);

  return {
    address: appKitAddress,
    caipAddress,
    isConnecting,
    isConnected: !!appKitAddress,
    connect,
    disconnect,
  };
};
