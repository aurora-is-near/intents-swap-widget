import { useCallback, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ethers } from 'ethers';
import type { Token } from '@/types/token';
import {
  evmAddressToIntentsAssetId,
  intentsAssetIdToEvmAddress,
  isAuroraAssetId,
  isAuroraChain,
  isAuroraToken,
  loadAuroraTokens,
  parseAuroraToken,
} from '@/utils/aurora';
import { AURORA_CHAIN_CONFIG } from '@/constants/aurora';
import { useAuroraExitToNear } from './useAuroraExitToNear';

interface UseAuroraOptions {
  enabled?: boolean;
  providers?: {
    evm?: ethers.BrowserProvider;
  };
}

/**
 * Comprehensive hook for Aurora chain operations
 * Provides all Aurora-related functionality in one place
 */
export function useAurora(options: UseAuroraOptions = {}) {
  const { enabled = true, providers } = options;

  // Fetch Aurora tokens
  const tokensQuery = useQuery<(Token | null)[]>({
    queryKey: ['aurora-tokens'],
    queryFn: async () => {
      const response = await loadAuroraTokens();

      return response.items.map(parseAuroraToken);
    },
    enabled,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 30 * 60 * 1000, // 30 minutes
  });

  // Filter out null tokens
  const tokens = useMemo(() => {
    return (tokensQuery.data ?? []).filter(
      (token): token is Token => token !== null,
    );
  }, [tokensQuery.data]);

  // Exit to NEAR functionality
  const { executeExitToNear } = useAuroraExitToNear({
    provider: providers?.evm,
  });

  // Helper to check if a transfer is Aurora Out of VC
  const isAuroraOutOfVC = useCallback(
    (sourceChain: string, targetChain: string) => {
      return isAuroraChain(sourceChain) && targetChain === 'near';
    },
    [],
  );

  // Helper to check if a transfer is Aurora Into VC
  const isAuroraIntoVC = useCallback(
    (sourceChain: string, targetChain: string) => {
      return sourceChain !== 'aurora' && isAuroraChain(targetChain);
    },
    [],
  );

  // Helper to get Aurora chain config
  const getChainConfig = useCallback(() => AURORA_CHAIN_CONFIG, []);

  // Helper to find Aurora token by address
  const findTokenByAddress = useCallback(
    (address: string): Token | undefined => {
      const normalizedAddress = address.toLowerCase();

      return tokens.find(
        (token) => token.contractAddress?.toLowerCase() === normalizedAddress,
      );
    },
    [tokens],
  );

  // Helper to find Aurora token by AssetId
  const findTokenByAssetId = useCallback(
    (assetId: string): Token | undefined => {
      if (!isAuroraAssetId(assetId)) {
        return undefined;
      }

      const evmAddress = intentsAssetIdToEvmAddress(assetId);

      if (!evmAddress) {
        return undefined;
      }

      return findTokenByAddress(evmAddress);
    },
    [findTokenByAddress],
  );

  return {
    // Token data
    tokens,
    tokensLoading: tokensQuery.isLoading,
    tokensError: tokensQuery.error,
    refetchTokens: tokensQuery.refetch,

    // Token utilities
    findTokenByAddress,
    findTokenByAssetId,

    // Chain utilities
    isAuroraChain,
    isAuroraToken,
    isAuroraAssetId,
    isAuroraOutOfVC,
    isAuroraIntoVC,
    getChainConfig,

    // AssetId mapping
    evmAddressToIntentsAssetId,
    intentsAssetIdToEvmAddress,

    // Exit to NEAR
    executeExitToNear,
  };
}
