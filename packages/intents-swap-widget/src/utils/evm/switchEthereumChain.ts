import { Eip1193Provider } from 'ethers';

import {
  CHAINS_LIST,
  EVM_CHAIN_BASE_TOKENS,
  EVM_CHAIN_IDS_MAP,
} from '@/constants/chains';
import { logger } from '@/logger';
import { DEFAULT_RPCS } from '@/rpcs';
import type { EvmChains } from '@/types/chain';

export type SwitchChainErrorCode = 'CHAIN_NOT_AVAILABLE' | 'SWITCH_FAILED';

export class SwitchChainError extends Error {
  code: SwitchChainErrorCode;

  targetChainId: number;

  constructor(
    message: string,
    code: SwitchChainErrorCode,
    targetChainId: number,
  ) {
    super(message);
    this.name = 'SwitchChainError';
    this.code = code;
    this.targetChainId = targetChainId;
  }
}

const findEvmChainById = (chainId: number): EvmChains | undefined =>
  (Object.keys(EVM_CHAIN_IDS_MAP) as EvmChains[]).find(
    (chain) => EVM_CHAIN_IDS_MAP[chain] === chainId,
  );

/**
 * 4902 = the wallet has never had this chain added. Recoverable: offer the
 * chain via `wallet_addEthereumChain` (EIP-3085 — the wallet prompts the user
 * to add, and usually to switch to, it) with metadata from the widget's own
 * chain registry.
 */
const addEthereumChain = async (
  targetChainId: number,
  provider: Eip1193Provider,
): Promise<void> => {
  const chain = findEvmChainById(targetChainId);
  const rpcUrls = chain ? DEFAULT_RPCS[chain] : undefined;

  if (!chain || !rpcUrls?.length) {
    throw new SwitchChainError(
      `Chain ${targetChainId} is not available.`,
      'CHAIN_NOT_AVAILABLE',
      targetChainId,
    );
  }

  const baseToken = EVM_CHAIN_BASE_TOKENS[chain];

  await provider.request({
    method: 'wallet_addEthereumChain',
    params: [
      {
        chainId: `0x${targetChainId.toString(16)}`,
        chainName: CHAINS_LIST[chain].label,
        nativeCurrency: { name: baseToken, symbol: baseToken, decimals: 18 },
        rpcUrls,
      },
    ],
  });
};

/**
 * Switches the connected Ethereum wallet to the specified chain.
 * If already on the target chain, returns immediately. A chain the wallet has
 * never had added (error 4902) is offered to it via `wallet_addEthereumChain`
 * before giving up.
 *
 * @param targetChainId - The numeric chain ID to switch to (e.g., 1 for Ethereum mainnet)
 * @throws Error if no Ethereum wallet is found or if the switch fails
 */
export const switchEthereumChain = async (
  targetChainId: number,
  provider: Eip1193Provider,
): Promise<void> => {
  const requestSwitch = () =>
    provider.request({
      method: 'wallet_switchEthereumChain',
      params: [{ chainId: `0x${targetChainId.toString(16)}` }],
    });

  try {
    // Get current chain ID
    const currentChainIdHex = await provider.request({
      method: 'eth_chainId',
    });

    const currentChainId = parseInt(currentChainIdHex as string, 16);

    // Already on correct chain
    if (currentChainId === targetChainId) {
      return;
    }

    // Switch to target chain
    await requestSwitch();

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
      try {
        await addEthereumChain(targetChainId, provider);

        // Adding usually switches as well, but that is wallet-specific — the
        // explicit switch below is a no-op where it already happened.
        await requestSwitch();

        return;
      } catch (addError: unknown) {
        logger.error(addError);

        // The recovery contract is unchanged for consumers: a chain the
        // wallet does not have and would not add still surfaces as
        // CHAIN_NOT_AVAILABLE (useSwitchChain keys the unsupported-chain
        // state off this code).
        throw new SwitchChainError(
          `Chain ${targetChainId} is not available.`,
          'CHAIN_NOT_AVAILABLE',
          targetChainId,
        );
      }
    }

    logger.error(error);
    throw new SwitchChainError(
      `Please switch to the correct network (Chain ID: ${targetChainId}) in your wallet`,
      'SWITCH_FAILED',
      targetChainId,
    );
  }
};
