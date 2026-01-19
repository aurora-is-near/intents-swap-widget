import { useCallback, useContext, useMemo, useState } from 'react';
import { useAppKitAccount, useDisconnect } from '@reown/appkit/react';
import { AppKitContext } from '../appkit';
import { useConfig } from '../config';
import { noop } from '../utils';

type ChainType = 'evm' | 'solana' | 'unknown';

type AppKitWalletConfig = {
  isConnecting: boolean;
  isConnected: boolean;
  connect: () => Promise<void> | void;
  disconnect: () => Promise<void> | void;
  address: string | undefined;
  chainType: ChainType;
};

export const useAppKitWallet = (): AppKitWalletConfig => {
  const { appKit } = useContext(AppKitContext) ?? {};
  const { address: appKitAddress } = useAppKitAccount();
  const { disconnect: appKitDisconnect } = useDisconnect();
  const [isConnecting, setIsConnecting] = useState(false);
  const { enableStandaloneMode } = useConfig();

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

  const chainType = useMemo((): ChainType => {
    if (!appKitAddress) {
      return 'unknown';
    }

    // Detect chain type by address format
    if (appKitAddress.startsWith('0x')) {
      return 'evm';
    }

    return 'solana';
  }, [appKitAddress]);

  if (!enableStandaloneMode) {
    return {
      isConnecting: false,
      isConnected: false,
      connect: noop,
      disconnect: noop,
      address: undefined,
      chainType: 'unknown',
    };
  }

  return {
    chainType,
    address: appKitAddress,
    isConnecting,
    isConnected: !!appKitAddress,
    connect,
    disconnect,
  };
};
