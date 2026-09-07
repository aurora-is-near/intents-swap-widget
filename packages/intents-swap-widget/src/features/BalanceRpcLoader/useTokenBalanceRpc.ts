import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';

import { logger } from '@/logger';
import { useConfig } from '@/config';
import { NATIVE_NEAR_DUMB_ASSET_ID } from '@/constants/tokens';
import type { Token, WalletAddresses } from '@/types';
import type { ChainRpcUrls } from '@/types/chain';

import { buildNearRpcUrls } from '@/utils/near/rpc';
import { isEvmChain } from '@/utils/evm/isEvmChain';
import { isEvmToken } from '@/utils/evm/isEvmToken';
import { isEvmBaseToken } from '@/utils/evm/isEvmBaseToken';
import { getTonTokenBalance } from '@/utils/ton/getTonTokenBalance';
import { getEvmTokenBalance } from '@/utils/evm/getEvmTokenBalance';
import { getNearTokenBalance } from '@/utils/near/getNearTokenBalance';
import { getNativeNearBalance } from '@/utils/near/getNativeNearBalance';
import { getEvmMainTokenBalance } from '@/utils/evm/getEvmMainTokenBalance';
import { getSolanaRpcUrls } from '@/utils/solana/getSolanaRpcUrls';
import { getSolanaTokenBalance } from '@/utils/solana/getSolanaTokenBalance';
import { isWalletAddressCompatibleWithChain } from '@/utils/chains/isWalletAddressCompatibleWithChain';

import { useSupportedChains } from '@/hooks/useSupportedChains';
import { useWalletAddressForToken } from '@/hooks/useWalletAddressForToken';

import { getBalanceSourceForChain } from './getBalanceSourceForChain';

type Args = {
  token: Token;
  rpcs: ChainRpcUrls;
  connectedWallets: WalletAddresses;
};

export function useTokenBalanceRpc({ rpcs, token, connectedWallets }: Args) {
  const { tonCenterApiKey, alchemyApiKey, apiKey } = useConfig();
  const { supportedChains } = useSupportedChains();
  const { walletAddress } = useWalletAddressForToken(connectedWallets, token);

  // Create a stable key based on connected wallet addresses for react-query caching
  const walletKey = useMemo(() => {
    return Object.entries(connectedWallets)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([chain, addr]) => `${chain}:${addr}`)
      .join('|');
  }, [connectedWallets]);

  const hasCompatibleWallet =
    !!walletAddress &&
    supportedChains.includes(token.blockchain) &&
    isWalletAddressCompatibleWithChain(walletAddress, token.blockchain);

  const balanceSource = getBalanceSourceForChain({
    alchemyApiKey,
    chain: token.blockchain,
    rpcs,
  });

  return useQuery<string | null>({
    retry: 2,
    enabled: hasCompatibleWallet && balanceSource === 'rpc',
    queryKey: [
      'tokenBalance',
      token.assetId,
      token.blockchain,
      walletAddress,
      walletKey,
    ],
    queryFn: async () => {
      // 1. No wallet address to retrieve balance
      if (
        !walletAddress ||
        balanceSource !== 'rpc' ||
        !supportedChains.includes(token.blockchain) ||
        !isWalletAddressCompatibleWithChain(walletAddress, token.blockchain)
      ) {
        return null;
      }

      // 2. Near
      if (
        token.blockchain === 'near' &&
        supportedChains.includes(token.blockchain)
      ) {
        // Prepend the fee-service RPC proxy (keyed by the widget API key) as
        // primary, keeping the configured public NEAR RPCs as failover.
        const nearRpcUrls = buildNearRpcUrls(apiKey, rpcs.near ?? []);

        if (nearRpcUrls.length === 0) {
          return null;
        }

        if (token.assetId === NATIVE_NEAR_DUMB_ASSET_ID) {
          return getNativeNearBalance(walletAddress, nearRpcUrls);
        }

        return getNearTokenBalance(token, walletAddress, nearRpcUrls);
      }

      // 3. Do not fetch EVM balances if evms are not supported
      if (!supportedChains.includes('eth') && isEvmChain(token.blockchain)) {
        return null;
      }

      // 4. Fetch EVM native token balance (e.g., ETH, BNB, POL, etc.)
      if (isEvmChain(token.blockchain) && isEvmBaseToken(token)) {
        const rpcUrls = rpcs[token.blockchain] ?? [];

        return rpcUrls.length > 0
          ? getEvmMainTokenBalance(walletAddress, rpcUrls[0]!)
          : null;
      }

      // 5. EVM chain's token balance
      // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing
      if (isEvmToken(token) || isEvmChain(token.blockchain)) {
        const rpcUrls = rpcs[token.blockchain] ?? [];

        return rpcUrls.length > 0
          ? getEvmTokenBalance(token, walletAddress, rpcUrls[0]!)
          : null;
      }

      // 6. TON token balance
      if (token.blockchain === 'ton') {
        return getTonTokenBalance(token, walletAddress, tonCenterApiKey);
      }

      // 7. Solana token balance
      if (
        token.blockchain === 'sol' &&
        supportedChains.includes(token.blockchain)
      ) {
        return getSolanaTokenBalance(
          token,
          walletAddress,
          getSolanaRpcUrls({ alchemyApiKey, rpcs }),
        );
      }

      logger.warn(
        `Failed to fetch token balance for ${token.symbol} on ${token.blockchain}`,
      );

      // Add missing chains
      return null;
    },
  });
}
