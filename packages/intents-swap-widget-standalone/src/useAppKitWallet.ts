import { useCallback, useContext, useState } from 'react';
import { useAppKitAccount, useDisconnect } from '@reown/appkit/react';
import { AppKitContext } from './appkit';

type AppKitWalletConfig = {
  isConnecting: boolean;
  isConnected: boolean;
  connect: () => Promise<void> | void;
  disconnect: () => Promise<void> | void;
  address: string | undefined;
};

export const useAppKitWallet = (): AppKitWalletConfig => {
  const { appKit } = useContext(AppKitContext) ?? {};
  const { address: appKitAddress } = useAppKitAccount();
  const { disconnect: appKitDisconnect } = useDisconnect();
  const [isConnecting, setIsConnecting] = useState(false);

  const connect = useCallback(async () => {
    setIsConnecting(true);

    if (!appKit) {
      throw new Error('AppKit is not initialized');
    }

    try {
      await appKit.open();
    } catch (error) {
      setIsConnecting(false);
      throw error;
    }

    setIsConnecting(false);
  }, [appKit]);

  const disconnect = useCallback(async () => {
    await appKitDisconnect({ namespace: 'solana' });
    await appKitDisconnect({ namespace: 'eip155' });
  }, [appKitDisconnect]);

  return {
    address: appKitAddress,
    isConnecting,
    isConnected: !!appKitAddress,
    connect,
    disconnect,
  };
};
