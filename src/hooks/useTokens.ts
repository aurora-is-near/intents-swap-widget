import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { OneClickService } from '@defuse-protocol/one-click-sdk-typescript';
import type { TokenResponse } from '@defuse-protocol/one-click-sdk-typescript';

import { useConfig } from '@/config';
import { TOKENS_DATA } from '@/constants/tokens';
import { CHAINS_LIST, DEFAULT_CHAIN_ICON } from '@/constants/chains';
import { isValidChain } from '@/utils/checkers/isValidChain';
import { loadAuroraTokens, parseAuroraToken } from '@/utils/aurora';
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

export const useTokens = () => {
  const { showIntentTokens, allowedTokensList, filterTokens } = useConfig();

  // Fetch tokens from 1Click API
  const query = useQuery<TokenResponse[]>({
    queryKey: ['tokens'],
    queryFn: async () => {
      const tokens = await OneClickService.getTokens();

      return tokens;
    },
  });

  // Fetch Aurora tokens from Aurora Explorer API
  const auroraQuery = useQuery<(Token | null)[]>({
    queryKey: ['aurora-tokens'],
    queryFn: async () => {
      const response = await loadAuroraTokens();
      const parsed = response.items.map(parseAuroraToken);

      return parsed;
    },
  });

  const data = useMemo(() => {
    if (!query.data) {
      return [];
    }

    // Process 1Click API tokens
    const tokens: Token[] = query.data
      .map((token: TokenResponse) => {
        const blockchain = token.blockchain.toLowerCase();

        if (!isValidChain(blockchain)) {
          return null;
        }

        if (allowedTokensList && !allowedTokensList.includes(token.assetId)) {
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
      .filter((t) => !!t)
      .filter(filterTokens ?? (() => true));

    // Add Aurora tokens from Explorer API
    if (auroraQuery.data) {
      const auroraTokens = auroraQuery.data
        .filter((token): token is Token => token !== null)
        .filter(filterTokens ?? (() => true));

      tokens.push(...auroraTokens);
    }

    return showIntentTokens
      ? [
        ...tokens,
        // add intents tokens to the full list
        ...tokens
          .filter((t) => t && t.blockchain === 'near')
          .map((t) => ({ ...t, isIntent: true })),
      ]
      : tokens;
    // filterTokens is a function that gets new reference on config changes
    // but the actual filtering logic rarely changes, so we omit it from deps
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query.data, auroraQuery.data, showIntentTokens, allowedTokensList]);

  return {
    ...query,
    tokens: data,
  };
};
