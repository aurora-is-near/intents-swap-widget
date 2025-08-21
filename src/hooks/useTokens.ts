import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { OneClickService } from '@defuse-protocol/one-click-sdk-typescript';
import type { QueryObserverOptions } from '@tanstack/react-query';
import type { TokenResponse } from '@defuse-protocol/one-click-sdk-typescript';

import { TOKENS_DATA } from '@/constants/tokens';
import { CHAINS_LIST, DEFAULT_CHAIN_ICON } from '@/constants/chains';
import { isValidChain } from '@/utils/checkers/isValidChain';
import type { Chains } from '@/types/chain';
import type { Token } from '@/types/token';

const getTokenIcon = (token: TokenResponse): string => {
  const tokenSymbol = token.symbol.toLowerCase();

  return TOKENS_DATA[tokenSymbol]?.icon ?? '';
};

const getChainIcon = (blockchain: Chains): string => {
  return CHAINS_LIST[blockchain].icon ?? DEFAULT_CHAIN_ICON;
};

const capitalizeChainName = (token: TokenResponse) =>
  `${token.blockchain?.charAt(0).toUpperCase()}${token.blockchain?.slice(1)}`;

const getTokenName = (token: TokenResponse) => {
  return TOKENS_DATA[token.symbol]?.name ?? token.symbol;
};

export const useTokens = (
  options: Omit<
    QueryObserverOptions<TokenResponse[]>,
    'queryKey' | 'queryFn'
  > = {},
) => {
  const query = useQuery<TokenResponse[]>({
    ...options,
    queryKey: ['tokens'],
    queryFn: async () => {
      const tokens = await OneClickService.getTokens();

      return tokens;
    },
  });

  const data = useMemo(() => {
    if (!query.data) {
      return [];
    }

    const tokens: Token[] = query.data
      .map((token: TokenResponse) => {
        const blockchain = token.blockchain.toLowerCase();

        if (!isValidChain(blockchain)) {
          return null;
        }

        return {
          ...token,
          blockchain,
          isIntent: false,
          icon: getTokenIcon(token),
          name: getTokenName(token),
          chainIcon: getChainIcon(blockchain),
          chainName: capitalizeChainName(token),
          contractAddress: token.contractAddress,
        };
      })
      .filter((t) => !!t);

    return [
      ...tokens,
      // add Calyx tokens to the full list
      ...tokens
        .filter((t) => t && t.blockchain === 'near')
        .map((t) => ({ ...t, isIntent: true })),
    ];
  }, [query.data]);

  return {
    ...query,
    tokens: data,
  };
};
