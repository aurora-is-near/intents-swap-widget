import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { OneClickService } from '@defuse-protocol/one-click-sdk-typescript';

import { useConfig } from '@/config';
import {
  AURORA_BRIDGEABLE_ASSETS,
  isAuroraBridgeable,
} from '@/constants/aurora-assets';
import { CHAINS_LIST } from '@/constants/chains';
import { NATIVE_NEAR_DUMB_ASSET_ID, TOKENS_DATA } from '@/constants/tokens';
import { isValidChain } from '@/utils/checkers/isValidChain';
import {
  FEE_SERVICE_TOKENS_QUERY_KEY,
  fetchFeeServiceTokens,
} from '@/utils/feeServiceTokens';
import type { SimpleToken, Token } from '@/types/token';

const getTokenIcon = (tokenSymbol: string): string => {
  const symbol = tokenSymbol.toLowerCase();

  return TOKENS_DATA[symbol]?.icon ?? '';
};

const capitalizeChainName = (blockchain: string) =>
  `${blockchain?.charAt(0).toUpperCase()}${blockchain?.slice(1)}`;

const getTokenName = (tokenSymbol: string): string => {
  return TOKENS_DATA[tokenSymbol]?.name ?? tokenSymbol;
};

type UseTokensOptions = {
  variant?: 'source' | 'target';
  unrestricted?: boolean;
};

export const useTokens = ({
  variant,
  unrestricted = false,
}: UseTokensOptions = {}) => {
  const {
    allowedTokensList,
    allowedSourceTokensList,
    allowedTargetTokensList,
    enableAccountAbstraction,
    disabledInternalBalanceTokens,
    filterTokens,
    fetchSourceTokens,
    fetchTargetTokens,
    apiKey,
  } = useConfig();

  const hasCustomFetch =
    (variant === 'source' && !!fetchSourceTokens) ||
    (variant === 'target' && !!fetchTargetTokens);

  // Primary: fee service (returns both tokens + asset_stats in one request).
  // Shares the same cache entry with useTokenVolumeStats — no duplicate network call.
  const { data: feeServiceData, ...feeQuery } = useQuery({
    queryKey: [FEE_SERVICE_TOKENS_QUERY_KEY, apiKey],
    queryFn: () => fetchFeeServiceTokens(apiKey!),
    enabled: !!apiKey && !hasCustomFetch,
    staleTime: 10 * 60 * 1000,
    select: (response) => response.tokens,
  });

  // Fallback: 1Click API (used when no apiKey) or custom variant fetch.
  const { data: fallbackData, ...fallbackQuery } = useQuery<SimpleToken[]>({
    queryKey: ['tokens', variant].filter(Boolean),
    queryFn: async (): Promise<SimpleToken[]> => {
      if (variant === 'source' && fetchSourceTokens) {
        return fetchSourceTokens();
      }

      if (variant === 'target' && fetchTargetTokens) {
        return fetchTargetTokens();
      }

      return OneClickService.getTokens();
    },
    enabled: !apiKey || hasCustomFetch,
  });

  const queryData = feeServiceData ?? fallbackData;
  const query = !!apiKey && !hasCustomFetch ? feeQuery : fallbackQuery;

  const data = useMemo(() => {
    if (!queryData) {
      return [];
    }

    const tokens: Token[] = queryData
      .map((token: SimpleToken): Token | null => {
        const blockchain = token.blockchain.toLowerCase();

        if (!isValidChain(blockchain)) {
          return null;
        }

        if (blockchain === 'aurora' && !isAuroraBridgeable(token.assetId)) {
          return null;
        }

        if (
          !unrestricted &&
          allowedTokensList &&
          !allowedTokensList.includes(token.assetId) &&
          !allowedTokensList.includes(token.symbol)
        ) {
          return null;
        }

        if (
          !unrestricted &&
          variant === 'source' &&
          allowedSourceTokensList &&
          !(
            allowedSourceTokensList.includes(token.assetId) ||
            allowedSourceTokensList.includes(token.symbol)
          )
        ) {
          return null;
        }

        if (
          !unrestricted &&
          variant === 'target' &&
          allowedTargetTokensList &&
          !(
            allowedTargetTokensList.includes(token.assetId) ||
            allowedTargetTokensList.includes(token.symbol)
          )
        ) {
          return null;
        }

        return {
          assetId: token.assetId,
          symbol: token.symbol,
          decimals: token.decimals,
          price: token.price,
          blockchain,
          isIntent: false,
          icon: token.icon ?? getTokenIcon(token.symbol),
          name: getTokenName(token.symbol),
          chainName:
            CHAINS_LIST[token.blockchain]?.label ??
            capitalizeChainName(token.blockchain),
          contractAddress: token.contractAddress,
        };
      })
      .filter((t) => !!t)
      .filter(unrestricted ? () => true : (filterTokens ?? (() => true)));

    // remove wNEAR token
    let tokensWithoutWNEAR = tokens.filter(
      (t) => t.symbol.toLowerCase() !== 'wnear',
    );

    // wNEAR token to get price
    const wnearToken = tokens.find((t) => t.symbol.toLowerCase() === 'wnear');

    // add native NEAR if the original list included wNEAR
    if (wnearToken) {
      tokensWithoutWNEAR.push({
        name: 'NEAR',
        symbol: 'NEAR',
        chainName: 'Near',
        blockchain: 'near',
        assetId: NATIVE_NEAR_DUMB_ASSET_ID,
        icon: TOKENS_DATA.near?.icon ?? '',
        price: wnearToken?.price ?? 0,
        contractAddress: wnearToken?.contractAddress,
        isIntent: false,
        decimals: 24,
      });
    }

    // 1Click does not return Aurora tokens, so we synthesise them from a
    // hardcoded map. Each entry borrows price/icon/name from the matching
    // nep141 token already in the upstream list (since the underlying asset is
    // the same on Intents).
    const auroraTokens: Token[] = AURORA_BRIDGEABLE_ASSETS.map(
      (asset): Token | undefined => {
        const upstream = queryData.find((t) => t.assetId === asset.assetId);

        if (!upstream) {
          return;
        }

        return {
          assetId: asset.assetId,
          symbol: asset.symbol,
          decimals: asset.decimals,
          price: upstream.price,
          blockchain: 'aurora' as const,
          isIntent: false,
          icon: upstream.icon ?? getTokenIcon(asset.symbol),
          name: getTokenName(asset.symbol.toLowerCase()),
          chainName: CHAINS_LIST.aurora.label,
          contractAddress: asset.evmAddress,
        };
      },
    ).filter((t): t is Token => !!t);

    tokensWithoutWNEAR = [...tokensWithoutWNEAR, ...auroraTokens];

    // rename USDT0 tokens to USDT
    tokensWithoutWNEAR = tokensWithoutWNEAR.map((t) => {
      if (t.symbol.toLowerCase() === 'usdt0') {
        return {
          ...t,
          name: 'USDT',
          symbol: 'USDT',
          icon: getTokenIcon('USDT'),
          isIntent: false,
        };
      }

      return t;
    });

    const intentsTokens = tokens
      .filter(
        (t) =>
          ![
            ...(unrestricted ? [] : (disabledInternalBalanceTokens ?? [])).map(
              (tkn) => tkn.toLowerCase(),
            ),
            // USDT0 exists on different chains as a synthetic version of native multi-chain USDT
            'usdt0',
          ].includes(t.symbol.toLowerCase()),
      )
      .map((t) =>
        t.symbol.toLowerCase() === 'wnear'
          ? { ...t, symbol: 'NEAR', name: 'NEAR', isIntent: true } // do not expose that it's wrapped
          : { ...t, isIntent: true },
      );

    return unrestricted || enableAccountAbstraction === true
      ? [
          ...tokensWithoutWNEAR,
          // add intents tokens to the full list
          ...intentsTokens,
        ]
      : tokensWithoutWNEAR;
  }, [
    queryData,
    enableAccountAbstraction,
    disabledInternalBalanceTokens,
    filterTokens,
    allowedTokensList,
    allowedSourceTokensList,
    allowedTargetTokensList,
    unrestricted,
    variant,
  ]);

  return {
    ...query,
    tokens: data,
  };
};
