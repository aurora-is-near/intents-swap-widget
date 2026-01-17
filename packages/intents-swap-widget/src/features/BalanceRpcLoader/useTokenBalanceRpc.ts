import { useQuery } from '@tanstack/react-query';

import { logger } from '../../logger';
import { getTonTokenBalance } from '../../utils/ton/getTonTokenBalance';
import { getSolanaTokenBalance } from '../../utils/solana/getSolanaTokenBalance';
import { WalletAddresses } from '../../types';
import { useWalletAddressForToken } from '../../hooks/useWalletAddressForToken';
import { useConfig } from '@/config';
import { isEvmChain } from '@/utils/evm/isEvmChain';
import { isEvmToken } from '@/utils/evm/isEvmToken';
import { isEvmBaseToken } from '@/utils/evm/isEvmBaseToken';
import { NATIVE_NEAR_DUMB_ASSET_ID } from '@/constants/tokens';
import { getEvmMainTokenBalance } from '@/utils/evm/getEvmMainTokenBalance';
import { getNativeNearBalance } from '@/utils/near/getNativeNearBalance';
import { getNearTokenBalance } from '@/utils/near/getNearTokenBalance';
import { getEvmTokenBalance } from '@/utils/evm/getEvmTokenBalance';
import type { ChainRpcUrls } from '@/types/chain';
import type { Token } from '@/types/token';

type Args = {
  token: Token;
  rpcs: ChainRpcUrls;
  connectedWallets: WalletAddresses;
};

export function useTokenBalanceRpc({ rpcs, token, connectedWallets }: Args) {
  const { walletSupportedChains, tonCenterApiKey, alchemyApiKey } = useConfig();
  const { walletAddress } = useWalletAddressForToken(connectedWallets, token);

  // Create a stable key based on connected wallet addresses for react-query caching
  const walletKey = Object.entries(connectedWallets)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([chain, addr]) => `${chain}:${addr}`)
    .join('|');

  return useQuery<string | null>({
    retry: 2,
    enabled: !!walletAddress && Object.keys(rpcs).includes(token.blockchain),
    queryKey: ['tokenBalance', token.assetId, walletKey],
    queryFn: async () => {
      // 1. No wallet address to retrieve balance
      if (!walletAddress) {
        return null;
      }

      // 2. Near
      if (
        token.blockchain === 'near' &&
        walletSupportedChains.includes(token.blockchain)
      ) {
        if (!rpcs.near || rpcs.near.length === 0) {
          return null;
        }

        if (token.assetId === NATIVE_NEAR_DUMB_ASSET_ID) {
          return getNativeNearBalance(walletAddress, rpcs.near);
        }

        return getNearTokenBalance(token, walletAddress, rpcs.near);
      }

      // 3. Do not fetch EVM balances if evms are not supported
      if (
        !walletSupportedChains.includes('eth') &&
        isEvmChain(token.blockchain)
      ) {
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
        walletSupportedChains.includes(token.blockchain)
      ) {
        return getSolanaTokenBalance(token, walletAddress, alchemyApiKey);
      }

      logger.warn(
        `Failed to fetch token balance for ${token.symbol} on ${token.blockchain}`,
      );

      // Add missing chains
      return null;
    },
  });
}
