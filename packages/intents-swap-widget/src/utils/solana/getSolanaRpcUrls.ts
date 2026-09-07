import type { ChainRpcUrls } from '@/types/chain';

const ALCHEMY_SOLANA_RPC_BASE = 'https://solana-mainnet.g.alchemy.com/v2';

type Args = {
  alchemyApiKey?: string;
  rpcs: ChainRpcUrls;
};

/**
 * Get the Solana RPC URLs to use for a transfer.
 *
 * Alchemy is preferred when a key is configured, with the configured public
 * RPCs as failover.
 */
export const getSolanaRpcUrls = ({ alchemyApiKey, rpcs }: Args): string[] => {
  const configured = rpcs.sol ?? [];

  if (!alchemyApiKey) {
    return configured;
  }

  return [`${ALCHEMY_SOLANA_RPC_BASE}/${alchemyApiKey}`, ...configured];
};
