import { useCallback, useContext, useMemo, useState } from 'react';
import { AppKitContext } from '../providers/AppKitProvider';
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
  const {
    appKit,
    address: appKitAddress,
    disconnect: appKitDisconnect,
  } = useContext(AppKitContext) ?? {};

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
    await appKitDisconnect?.({ namespace: 'solana' });
    await appKitDisconnect?.({ namespace: 'eip155' });
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
