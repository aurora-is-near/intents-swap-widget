import { useCallback, useMemo, useState } from 'react';
import { useAppKit, useAppKitAccount } from '@reown/appkit/react';
import { useProviders } from './useProviders';

type ChainType = 'evm' | 'solana' | 'unknown';

export const useAppKitWallet = () => {
  const { open } = useAppKit();
  const { address: appKitAddress } = useAppKitAccount();
  const [isConnecting, setIsConnecting] = useState(false);
  const providers = useProviders();

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

  // For EVM chains, AppKit handles disconnect internally via the modal
  const disconnect = useCallback(async () => {
    if (providers.sol?.disconnect) {
      await providers.sol.disconnect();
    }
  }, [providers.sol]);

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
