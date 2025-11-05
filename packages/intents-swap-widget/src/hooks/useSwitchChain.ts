import { useCallback, useEffect, useState } from 'react';
import { EVM_CHAIN_IDS_MAP } from '@/constants/chains';
import { useUnsafeSnapshot } from '@/machine/snap';
import { isEvmChain } from '@/utils';
import { logger } from '@/logger';

export const useSwitchChain = () => {
  const { ctx } = useUnsafeSnapshot();
  const [isSwitchingChain, setIsSwitchingChain] = useState(false);
  const [currentWalletChainId, setCurrentWalletChainId] = useState<
    number | null
  >(null);

  // Auto-detect current wallet chain ID from window.ethereum
  useEffect(() => {
    const updateChainId = async () => {
      if (!window.ethereum) {
        return;
      }

      try {
        const chainId = await window.ethereum.request({
          method: 'eth_chainId',
        });

        setCurrentWalletChainId(parseInt(chainId, 16));
      } catch (error) {
        logger.error('Failed to get current chain ID:', error);
      }
    };

    void updateChainId();

    // Listen for chain changes
    if (window.ethereum) {
      const handleChainChanged = (chainId: string) => {
        setCurrentWalletChainId(parseInt(chainId, 16));
      };

      window.ethereum.on?.('chainChanged', handleChainChanged);

      return () => {
        window.ethereum?.removeListener?.('chainChanged', handleChainChanged);
      };
    }
  }, []);

  // Check if chain switching is needed
  const isSwitchingChainRequired = useCallback(() => {
    if (!ctx.sourceToken || !window.ethereum) {
      return false;
    }

    // Only for EVM chains
    if (!isEvmChain(ctx.sourceToken.blockchain)) {
      return false;
    }

    const requiredChainId = EVM_CHAIN_IDS_MAP[ctx.sourceToken.blockchain];

    if (!requiredChainId || !currentWalletChainId) {
      return false;
    }

    return currentWalletChainId !== requiredChainId;
  }, [ctx.sourceToken, currentWalletChainId]);

  const switchChain = useCallback(async () => {
    if (!ctx.sourceToken || !window.ethereum) {
      return false;
    }

    if (!isEvmChain(ctx.sourceToken.blockchain)) {
      return false;
    }

    const targetChainId = EVM_CHAIN_IDS_MAP[ctx.sourceToken.blockchain];

    if (!targetChainId) {
      return false;
    }

    try {
      setIsSwitchingChain(true);

      // Use standard EIP-3326 wallet_switchEthereumChain method
      await window.ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: `0x${targetChainId.toString(16)}` }],
      });

      setCurrentWalletChainId(targetChainId);

      return true;
    } catch (error: unknown) {
      // Error code 4902 means the chain hasn't been added to the wallet yet
      if (
        error &&
        typeof error === 'object' &&
        'code' in error &&
        error.code === 4902
      ) {
        logger.error(
          'Chain not available in wallet. User needs to add it manually:',
          error,
        );
      } else {
        logger.error('Failed to switch chain:', error);
      }

      return false;
    } finally {
      setIsSwitchingChain(false);
    }
  }, [ctx.sourceToken]);

  return {
    isSwitchingChainRequired: isSwitchingChainRequired(),
    switchChain,
    isSwitchingChain,
    currentWalletChainId,
    requiredChainId:
      ctx.sourceToken && isEvmChain(ctx.sourceToken.blockchain)
        ? EVM_CHAIN_IDS_MAP[ctx.sourceToken.blockchain]
        : null,
  };
};
