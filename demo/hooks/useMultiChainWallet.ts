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

  const { address, chainType } = useMemo(() => {
    if (wallets.ton) {
      return { address: wallets.ton, chainType: 'ton' };
    }

    if (wallets.evm) {
      return { address: wallets.evm, chainType: 'evm' };
    }

    if (wallets.solana) {
      return { address: wallets.solana, chainType: 'solana' };
    }

    return { address: undefined, chainType: 'unknown' };
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

  // Track TON connecting state: wallet is being connected but address not yet available
  const isTonConnecting = isTonConnectionRestored && !!tonWallet && !tonAddress;

  return {
    wallets,
    address,
    chainType,
    chainId: chain?.id,
    chainName: chain?.name,
    isConnecting:
      isEvmConnecting || !isTonConnectionRestored || isTonConnecting,
    isConnected: hasAnyWallet,
    connect,
    disconnect,
  };
}
