import { useCallback, useEffect, useState } from 'react';
import { EVM_CHAIN_IDS_MAP } from '@/constants/chains';
import { useConfig } from '@/config';
import { useUnsafeSnapshot } from '@/machine/snap';
import { isEvmChain } from '@/utils';
import { logger } from '@/logger';

export const useSwitchChain = () => {
  const { ctx } = useUnsafeSnapshot();
  const { getCurrentChainId, switchChain: switchChainConfig } = useConfig();
  const [isSwitchingChain, setIsSwitchingChain] = useState(false);
  const [currentWalletChainId, setCurrentWalletChainId] = useState<
    number | null
  >(null);

  // Get current wallet chain ID
  useEffect(() => {
    if (!getCurrentChainId) {
      return;
    }

    const updateChainId = async () => {
      const chainId = await getCurrentChainId();

      setCurrentWalletChainId(chainId);
    };

    void updateChainId();

    // Listen for chain changes if available
    if (window.ethereum) {
      const handleChainChanged = (chainId: string) => {
        setCurrentWalletChainId(parseInt(chainId, 16));
      };

      window.ethereum.on?.('chainChanged', handleChainChanged);

      return () => {
        window.ethereum?.removeListener?.('chainChanged', handleChainChanged);
      };
    }
  }, [getCurrentChainId]);

  // Check if chain switching is needed
  const isSwitchingChainRequired = useCallback(() => {
    if (!ctx.sourceToken || !switchChainConfig) {
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
  }, [ctx.sourceToken, switchChainConfig, currentWalletChainId]);

  const switchChain = useCallback(async () => {
    if (!ctx.sourceToken || !switchChainConfig) {
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
      await switchChainConfig(targetChainId);
      setCurrentWalletChainId(targetChainId);

      return true;
    } catch (error) {
      logger.error('Failed to switch chain:', error);

      return false;
    } finally {
      setIsSwitchingChain(false);
    }
  }, [ctx.sourceToken, switchChainConfig]);

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
