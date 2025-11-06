import { logger } from '@/logger';

class SwitchChainError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SwitchChainError';
  }
}

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
  if (!window.ethereum) {
    throw new SwitchChainError('No Ethereum wallet found');
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

    logger.debug(
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
      throw new SwitchChainError(`Chain ${targetChainId} is not available.`);
    }

    logger.error(error);
    throw new SwitchChainError(
      `Please switch to the correct network (Chain ID: ${targetChainId}) in your wallet`,
    );
  }
};
