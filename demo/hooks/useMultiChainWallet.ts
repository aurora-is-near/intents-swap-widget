import { useCallback, useMemo } from 'react';
import { useAccount, useDisconnect } from 'wagmi';
import {
  useIsConnectionRestored,
  useTonAddress,
  useTonConnectUI,
  useTonWallet,
} from '@tonconnect/ui-react';
import { useAppKit } from '@reown/appkit/react';

export type ChainType = 'evm' | 'ton' | 'solana' | 'unknown';

export interface MultiChainWallets {
  evm?: string;
  ton?: string;
  solana?: string;
}

export function useMultiChainWallet() {
  const {
    address: evmAddress,
    isConnecting: isEvmConnecting,
    chain,
  } = useAccount();

  const { disconnect: disconnectEvm } = useDisconnect();

  const tonAddress = useTonAddress();
  const tonWallet = useTonWallet();
  const [tonConnectUI] = useTonConnectUI();
  const isTonConnectionRestored = useIsConnectionRestored();

  const { open } = useAppKit();

  // Return ALL connected wallets instead of just one
  const wallets = useMemo<MultiChainWallets>(() => {
    const result: MultiChainWallets = {};

    // Only include TON address after connection is restored
    if (isTonConnectionRestored && tonAddress) {
      result.ton = tonAddress;
    }

    if (evmAddress) {
      result.evm = evmAddress;
    }

    return result;
  }, [tonAddress, tonWallet, evmAddress, isTonConnectionRestored]);

  // Determine primary address and chain type (for backward compatibility)
  const { address, chainType } = useMemo(() => {
    // Prefer TON if connected
    if (wallets.ton) {
      return { address: wallets.ton, chainType: 'ton' as ChainType };
    }

    if (wallets.evm) {
      return { address: wallets.evm, chainType: 'evm' as ChainType };
    }

    if (wallets.solana) {
      return { address: wallets.solana, chainType: 'solana' as ChainType };
    }

    return { address: undefined, chainType: 'unknown' as ChainType };
  }, [wallets]);

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

  const hasAnyWallet = !!(wallets.ton ?? wallets.evm ?? wallets.solana);

  return {
    // All connected wallets
    wallets,
    // Primary wallet (for backward compatibility)
    address,
    chainType,
    chainId: chain?.id,
    chainName: chain?.name,
    isConnecting: isEvmConnecting || !isTonConnectionRestored,
    isConnected: hasAnyWallet,
    connect,
    disconnect,
  };
}
