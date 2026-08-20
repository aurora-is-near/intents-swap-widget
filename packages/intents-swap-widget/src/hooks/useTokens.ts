import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';

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

  let customFetch: (() => Promise<SimpleToken[]>) | undefined;

  if (variant === 'source') {
    customFetch = fetchSourceTokens;
  } else if (variant === 'target') {
    customFetch = fetchTargetTokens;
  }

  const hasCustomFetch = !!customFetch;

  // Primary: fee service (returns both tokens + asset_stats in one request).
  // Shares the same cache entry with useTokenVolumeStats — no duplicate network call.
  const { data: feeServiceData, ...feeQuery } = useQuery({
    queryKey: [FEE_SERVICE_TOKENS_QUERY_KEY, apiKey],
    queryFn: () => fetchFeeServiceTokens(apiKey!),
    enabled: !!apiKey && !hasCustomFetch,
    staleTime: 10 * 60 * 1000,
    select: (response) => response.tokens,
  });

  // A custom variant fetch takes precedence over the fee service.
  const { data: customData, ...customQuery } = useQuery<SimpleToken[]>({
    queryKey: ['tokens', variant].filter(Boolean),
    queryFn: async (): Promise<SimpleToken[]> => {
      return customFetch ? customFetch() : [];
    },
    enabled: hasCustomFetch,
  });

  const queryData = feeServiceData ?? customData;
  const query = hasCustomFetch ? customQuery : feeQuery;

  const data = useMemo(() => {
    if (!queryData) {
      return [];
    }

    // Shared by the upstream list and the synthesised Aurora entries below, so
    // an allowlist cannot be sidestepped by a token that never came from the
    // upstream response.
    const isAllowedToken = (assetId: string, symbol: string): boolean => {
      if (unrestricted) {
        return true;
      }

      if (
        allowedTokensList &&
        !allowedTokensList.includes(assetId) &&
        !allowedTokensList.includes(symbol)
      ) {
        return false;
      }

      if (
        variant === 'source' &&
        allowedSourceTokensList &&
        !(
          allowedSourceTokensList.includes(assetId) ||
          allowedSourceTokensList.includes(symbol)
        )
      ) {
        return false;
      }

      if (
        variant === 'target' &&
        allowedTargetTokensList &&
        !(
          allowedTargetTokensList.includes(assetId) ||
          allowedTargetTokensList.includes(symbol)
        )
      ) {
        return false;
      }

      return true;
    };

    const tokens: Token[] = queryData
      .map((token: SimpleToken): Token | null => {
        const blockchain = token.blockchain.toLowerCase();

        if (!isValidChain(blockchain)) {
          return null;
        }

        if (blockchain === 'aurora' && !isAuroraBridgeable(token.assetId)) {
          return null;
        }

        if (!isAllowedToken(token.assetId, token.symbol)) {
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

        // They are synthesised rather than returned upstream, so they have to
        // be gated here — otherwise a restricted config still shows all of them.
        if (!isAllowedToken(asset.assetId, asset.symbol)) {
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
    )
      .filter((t): t is Token => !!t)
      .filter(unrestricted ? () => true : (filterTokens ?? (() => true)));

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
