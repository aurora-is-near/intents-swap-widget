import { useCallback, useMemo, useState } from 'react';
import {
  useAppKit,
  useAppKitAccount,
  useDisconnect,
} from '@reown/appkit/react';

type ChainType = 'evm' | 'solana' | 'unknown';

export const useAppKitWallet = () => {
  const { open } = useAppKit();
  const { address: appKitAddress } = useAppKitAccount();
  const [isConnecting, setIsConnecting] = useState(false);
  const { disconnect: appKitDisconnect } = useDisconnect();

  const connect = useCallback(async () => {
    setIsConnecting(true);

    try {
      await open();
    } catch (error) {
      setIsConnecting(false);
      throw error;
    }

    setIsConnecting(false);
  }, [open]);

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

  return {
    chainType,
    address: appKitAddress,
    isConnecting,
    isConnected: !!appKitAddress,
    connect,
    disconnect,
  };
};
