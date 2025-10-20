import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { OneClickService } from '@defuse-protocol/one-click-sdk-typescript';
import type { TokenResponse } from '@defuse-protocol/one-click-sdk-typescript';

import { useConfig } from '@/config';
import { NATIVE_NEAR_DUMB_ASSET_ID, TOKENS_DATA } from '@/constants/tokens';
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

export const useTokens = (variant?: 'source' | 'target') => {
  const {
    showIntentTokens,
    allowedTokensList,
    allowedSourceTokensList,
    allowedTargetTokensList,
    filterTokens,
  } = useConfig();

  const query = useQuery<TokenResponse[]>({
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

        if (allowedTokensList && !allowedTokensList.includes(token.assetId)) {
          return null;
        }

        if (
          variant === 'source' &&
          allowedSourceTokensList &&
          !allowedSourceTokensList.includes(token.assetId)
        ) {
          return null;
        }

        if (
          variant === 'target' &&
          allowedTargetTokensList &&
          !allowedTargetTokensList.includes(token.assetId)
        ) {
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

    // remove wNEAR token
    const tokensWithoutWNEAR = tokens.filter(
      (t) => t.symbol.toLowerCase() !== 'wnear',
    );

    // wNEAR token to get price
    const wnearToken = tokens.find((t) => t.symbol.toLowerCase() === 'wnear');

    // add native NEAR
    tokensWithoutWNEAR.push({
      name: 'NEAR',
      symbol: 'NEAR',
      chainName: 'Near',
      blockchain: 'near',
      assetId: NATIVE_NEAR_DUMB_ASSET_ID,
      chainIcon: getChainIcon('near'),
      icon: TOKENS_DATA.near?.icon ?? '',
      price: wnearToken?.price ?? 0,
      contractAddress: wnearToken?.contractAddress,
      isIntent: false,
      decimals: 24,
    });

    return showIntentTokens
      ? [
          ...tokensWithoutWNEAR,
          // add intents tokens to the full list
          ...tokens.map((t) =>
            t.symbol.toLowerCase() === 'wnear'
              ? { ...t, symbol: 'NEAR', name: 'NEAR', isIntent: true } // do not expose that it's wrapped
              : { ...t, isIntent: true },
          ),
        ]
      : tokensWithoutWNEAR;
  }, [query.data, showIntentTokens, filterTokens]);

  return {
    ...query,
    tokens: data,
  };
};
