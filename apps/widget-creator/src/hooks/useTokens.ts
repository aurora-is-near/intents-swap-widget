import {
  OneClickService,
  TokenResponse,
} from '@defuse-protocol/one-click-sdk-typescript';
import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import { TOKENS_DATA } from '../config';

export type TokenType = {
  assetIds: string[];
  decimals: number;
  blockchains: TokenResponse['blockchain'][];
  symbol: string;
  prices: number[];
  pricesUpdatedAt: string[];
  contractAddresses?: string[];
  icon: string | undefined;
};

export const getTokenIcon = (tokenSymbol: string): string | undefined => {
  const symbol = tokenSymbol.toLowerCase();

  return TOKENS_DATA[symbol]?.icon ?? undefined;
};

export const useTokens = (): TokenType[] => {
  const { data: queryData } = useQuery<TokenResponse[]>({
    queryKey: ['tokens'],
    queryFn: async (): Promise<TokenResponse[]> => {
      return OneClickService.getTokens();
    },
  });

  const tokensWithIcons = useMemo(() => {
    return (queryData ?? []).reduce<Record<string, TokenType>>((acc, token) => {
      const icon = getTokenIcon(token.symbol);

      if (token.symbol && acc[token.symbol]) {
        const existing = acc[token.symbol]!;

        existing.assetIds.push(token.assetId);
        existing.prices.push(token.price);
        existing.pricesUpdatedAt.push(token.priceUpdatedAt);

        if (!existing.blockchains.includes(token.blockchain)) {
          existing.blockchains.push(token.blockchain);
        }

        if (
          token.contractAddress &&
          !existing.contractAddresses?.includes(token.contractAddress)
        ) {
          existing.contractAddresses = [
            ...(existing.contractAddresses ?? []),
            token.contractAddress,
          ];
        }
      } else if (token.symbol && !acc[token.symbol]) {
        acc[token.symbol] = {
          assetIds: [token.assetId],
          decimals: token.decimals,
          blockchains: [token.blockchain],
          symbol: token.symbol,
          prices: [token.price],
          pricesUpdatedAt: [token.priceUpdatedAt],
          contractAddresses: token.contractAddress
            ? [token.contractAddress]
            : undefined,
          icon,
        };
      }

      return acc;
    }, {});
  }, [queryData]);

  return Object.values(tokensWithIcons);
};

export const isTokenAvailable = (
  token: TokenType,
  selectedNetworks: string[],
): boolean => {
  if (!selectedNetworks || selectedNetworks.length === 0) {
    return false;
  }

  return token.blockchains.some((blockchain) =>
    selectedNetworks.includes(blockchain),
  );
};
