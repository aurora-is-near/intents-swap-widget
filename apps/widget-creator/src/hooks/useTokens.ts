import { useMemo } from 'react';
import { Chains, useTokens } from '@aurora-is-near/intents-swap-widget';
import { TOKENS_DATA } from '../config';

export type TokenType = {
  assetIds: string[];
  decimals: number;
  blockchains: Chains[];
  symbol: string;
  prices: number[];
  contractAddresses?: string[];
  icon: string | undefined;
};

export const getTokenIcon = (
  tokenSymbol: string | undefined,
): string | undefined => {
  if (!tokenSymbol) {
    return undefined;
  }

  const symbol = tokenSymbol.toLowerCase();

  return TOKENS_DATA[symbol]?.icon ?? undefined;
};

export const useTokensGroupedBySymbol = (): TokenType[] => {
  const { tokens } = useTokens();

  const tokensWithIcons = useMemo(() => {
    return (tokens ?? []).reduce<Record<string, TokenType>>((acc, token) => {
      if (token.symbol && acc[token.symbol]) {
        const existing = acc[token.symbol]!;

        existing.assetIds.push(token.assetId);
        existing.prices.push(token.price);

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
          contractAddresses: token.contractAddress
            ? [token.contractAddress]
            : undefined,
          icon: token.icon,
        };
      }

      return acc;
    }, {});
  }, [tokens]);

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
