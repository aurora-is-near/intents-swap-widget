import { logger } from '@/logger';

/**
 * Switches the connected Ethereum wallet to the specified chain.
 * If already on the target chain, returns immediately.
 *
 * @param targetChainId - The numeric chain ID to switch to (e.g., 1 for Ethereum mainnet)
 * @throws Error if no Ethereum wallet is found or if the switch fails
 */
export const switchEthereumChain = async (
  targetChainId: number,
): Promise<void> => {
  if (typeof window === 'undefined' || !window.ethereum) {
    throw new Error('No Ethereum wallet found');
  }

  try {
    // Get current chain ID
    const currentChainIdHex = await window.ethereum.request({
      method: 'eth_chainId',
    });

    const currentChainId = parseInt(currentChainIdHex as string, 16);

    // Already on correct chain
    if (currentChainId === targetChainId) {
      return;
    }

    // Switch to target chain
    await window.ethereum.request({
      method: 'wallet_switchEthereumChain',
      params: [{ chainId: `0x${targetChainId.toString(16)}` }],
    });

    logger.info(
      `Successfully switched chain from ${currentChainId} to ${targetChainId}`,
    );
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
      throw new Error(
        `Chain ${targetChainId} is not available in your wallet. Please add it first.`,
      );
    }

    logger.error('Failed to switch chain:', error);
    throw new Error(
      `Please switch to the correct network (Chain ID: ${targetChainId}) in your wallet`,
    );
  }
};
