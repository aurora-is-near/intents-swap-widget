import { useQuery } from '@tanstack/react-query';

import { useConfig } from '@/config';
import { isEth } from '@/utils/evm/isEth';
import { isEvmChain } from '@/utils/evm/isEvmChain';
import { isEvmToken } from '@/utils/evm/isEvmToken';
import { isEvmBaseToken } from '@/utils/evm/isEvmBaseToken';
import { getEvmMainTokenBalance } from '@/utils/evm/getEvmMainTokenBalance';
import { getNearTokenBalance } from '@/utils/near/getNearTokenBalance';
import { getEvmTokenBalance } from '@/utils/evm/getEvmTokenBalance';
import type { ChainRpcUrls } from '@/types/chain';
import type { Token } from '@/types/token';

type Args = {
  token: Token;
  rpcs: ChainRpcUrls;
  walletAddress: string | undefined;
};

export function useTokenBalanceRpc({ rpcs, token, walletAddress }: Args) {
  const { walletSupportedChains } = useConfig();

  return useQuery<string | null>({
    retry: 2,
    staleTime: 30000, // Cache for 30 seconds to prevent duplicate calls
    enabled: !!walletAddress && Object.keys(rpcs).includes(token.blockchain),
    queryKey: ['tokenBalance', token.assetId, walletAddress],
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
        return rpcs.near && rpcs.near.length > 0
          ? getNearTokenBalance(token, walletAddress, rpcs.near)
          : null;
      }

      // 3. Do not fetch EVM balances if evms are not supported
      if (
        !walletSupportedChains.includes('eth') &&
        isEvmChain(token.blockchain)
      ) {
        return null;
      }

      // 4. Eth balance on EVM chain
      if (isEvmChain(token.blockchain) && isEth(token)) {
        const rpcUrls = rpcs[token.blockchain] ?? [];

        return rpcUrls.length > 0
          ? getEvmMainTokenBalance(walletAddress, rpcUrls[0]!)
          : null;
      }

      // 5. EVM chain's token balance
      if (
        isEvmToken(token) ??
        (isEvmBaseToken(token) && isEvmChain(token.blockchain))
      ) {
        const rpcUrls = rpcs[token.blockchain] ?? [];

        return rpcUrls.length > 0
          ? getEvmTokenBalance(token, walletAddress, rpcUrls[0]!)
          : null;
      }

      // Add missing chains
      return null;
    },
  });
}
