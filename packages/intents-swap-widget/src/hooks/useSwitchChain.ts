import { useCallback, useEffect, useState } from 'react';
import { Eip1193Provider } from 'ethers';
import { Providers } from '../types';
import { EVM_CHAIN_IDS_MAP } from '@/constants/chains';
import { useUnsafeSnapshot } from '@/machine/snap';
import { isEvmChain } from '@/utils';
import { logger } from '@/logger';
import { switchEthereumChain } from '@/utils/evm/switchEthereumChain';

const getCurrentChainId = async (provider: Eip1193Provider) => {
  if (!provider) {
    return;
  }

  const chainId = await provider.request({
    method: 'eth_chainId',
  });

  return parseInt(chainId, 16);
};

export const useSwitchChain = ({ providers }: { providers: Providers }) => {
  const { ctx } = useUnsafeSnapshot();
  const [isSwitchingChain, setIsSwitchingChain] = useState(false);
  const [isSwitchingChainRequired, setIsSwitchingChainRequired] =
    useState(false);

  // Check if chain switching is needed
  const checkIfSwitchingIsRequired = useCallback(async () => {
    const provider =
      typeof providers.evm === 'function'
        ? await providers.evm()
        : providers.evm;

    if (!ctx.sourceToken || !provider) {
      return false;
    }

    const currentWalletChainId = await getCurrentChainId(provider);

    // Only for EVM chains
    if (!isEvmChain(ctx.sourceToken.blockchain)) {
      return false;
    }

    const requiredChainId = EVM_CHAIN_IDS_MAP[ctx.sourceToken.blockchain];

    if (!requiredChainId || !currentWalletChainId) {
      return false;
    }

    return currentWalletChainId !== requiredChainId;
  }, [ctx.sourceToken, providers]);

  const switchChain = useCallback(async () => {
    const provider =
      typeof providers.evm === 'function'
        ? await providers.evm()
        : providers.evm;

    if (!ctx.sourceToken || !provider) {
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

      // Use shared utility function for chain switching
      await switchEthereumChain(targetChainId, provider);

      return true;
    } catch (error: unknown) {
      logger.error('Failed to switch chain:', error);

      return false;
    } finally {
      setIsSwitchingChain(false);
    }
  }, [ctx.sourceToken, providers]);

  useEffect(() => {
    void checkIfSwitchingIsRequired().then(setIsSwitchingChainRequired);
  }, [checkIfSwitchingIsRequired]);

  return {
    isSwitchingChainRequired,
    switchChain,
    isSwitchingChain,
  };
};
