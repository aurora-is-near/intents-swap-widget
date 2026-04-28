import { useCallback, useContext, useState } from 'react';
import { useAppKitAccount, useDisconnect } from '@reown/appkit/react';
import { AppKitContext } from './appkit';

type AppKitNamespace = 'eip155' | 'solana' | 'tron';

type AppKitWalletConfig = {
  isConnecting: boolean;
  isConnected: boolean;
  connect: (namespace?: AppKitNamespace) => Promise<void> | void;
  disconnect: () => Promise<void> | void;
  address: string | undefined;
};

export const useAppKitWallet = (): AppKitWalletConfig => {
  const { appKit } = useContext(AppKitContext) ?? {};
  const { address: appKitAddress } = useAppKitAccount();
  const { disconnect: appKitDisconnect } = useDisconnect();
  const [isConnecting, setIsConnecting] = useState(false);

  const connect = useCallback(
    async (namespace?: AppKitNamespace) => {
      setIsConnecting(true);

      if (!appKit) {
        throw new Error('AppKit is not initialized');
      }

      try {
        await appKit.open(
          namespace
            ? { view: 'Connect', namespace: namespace as never }
            : { view: 'Connect' },
        );
      } catch (error) {
        setIsConnecting(false);
        throw error;
      }

      setIsConnecting(false);
    },
    [appKit],
  );

  const disconnect = useCallback(async () => {
    await appKitDisconnect({ namespace: 'solana' });
    await appKitDisconnect({ namespace: 'eip155' });
    await appKitDisconnect({ namespace: 'tron' });
  }, [appKitDisconnect]);

  return {
    address: appKitAddress,
    isConnecting,
    isConnected: !!appKitAddress,
    connect,
    disconnect,
  };
};
