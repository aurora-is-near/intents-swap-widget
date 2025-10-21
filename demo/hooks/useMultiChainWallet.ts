import { useCallback, useMemo } from 'react';
import { useAccount, useDisconnect } from 'wagmi';
import { useTonAddress, useTonConnectUI } from '@tonconnect/ui-react';
import { useAppKit } from '@reown/appkit/react';

export type ChainType = 'evm' | 'ton' | 'solana' | 'unknown';

export function useMultiChainWallet() {
  const {
    address: evmAddress,
    isConnecting: isEvmConnecting,
    chain,
  } = useAccount();

  const { disconnect: disconnectEvm } = useDisconnect();

  const tonAddress = useTonAddress();
  const [tonConnectUI] = useTonConnectUI();

  const { open } = useAppKit();

  const { address, chainType } = useMemo(() => {
    if (tonAddress) {
      return { address: tonAddress, chainType: 'ton' as ChainType };
    }

    if (evmAddress) {
      return { address: evmAddress, chainType: 'evm' as ChainType };
    }

    return { address: undefined, chainType: 'unknown' as ChainType };
  }, [tonAddress, evmAddress]);

  const connect = useCallback(async () => {
    try {
      await open();
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Failed to open wallet modal:', error);
    }
  }, [open]);

  const disconnect = useCallback(async () => {
    try {
      if (tonAddress) {
        await tonConnectUI.disconnect();
      }

      if (evmAddress) {
        disconnectEvm();
      }
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Failed to disconnect wallet:', error);
    }
  }, [tonAddress, evmAddress, tonConnectUI, disconnectEvm]);

  return {
    address,
    chainType,
    chainId: chain?.id,
    chainName: chain?.name,
    isConnecting: isEvmConnecting,
    isConnected: !!address,
    connect,
    disconnect,
  };
}
