import {
  OneClickService,
  TokenResponse,
} from '@defuse-protocol/one-click-sdk-typescript';
import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import {
  CHAINS,
  Chains,
  SimpleToken,
} from '@aurora-is-near/intents-swap-widget';
import { TOKENS_DATA } from '../config';

export type TokenType = {
  decimals: number;
  blockchains: Chains[];
  symbol: string;
  contractAddresses?: string[];
  icon: string | undefined;
};

const isValidChain = (blockchain: string): blockchain is Chains => {
  return CHAINS.some((chain) => chain.id === blockchain);
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

const getTokenChain = (blockchain: string): Chains | null => {
  if (isValidChain(blockchain)) {
    return blockchain;
  }

  return null;
};

export const useTokens = (): SimpleToken[] => {
  const { data } = useQuery<TokenResponse[]>({
    queryKey: ['tokens'],
    queryFn: async (): Promise<TokenResponse[]> => {
      return OneClickService.getTokens();
    },
  });

  if (!data || data.length === 0) {
    return [];
  }

  const tokens = (data ?? [])
    .map((token): SimpleToken | null => {
      const blockchain = getTokenChain(token.blockchain);

      if (!blockchain) {
        return null;
      }

      return {
        assetId: token.assetId,
        symbol: token.symbol,
        decimals: token.decimals,
        price: token.price,
        blockchain,
        icon: getTokenIcon(token.symbol),
        contractAddress: token.contractAddress,
      };
    })
    .filter((token): token is SimpleToken => token !== null);

  return tokens;
};

export const useTokensGroupedBySymbol = (): TokenType[] => {
  const tokens = useTokens();

  const tokensWithIcons = useMemo(() => {
    return (tokens ?? []).reduce<Record<string, TokenType>>((acc, token) => {
      if (token.symbol && acc[token.symbol]) {
        const existing = acc[token.symbol]!;

        if (!existing.blockchains.some((b) => b === token.blockchain)) {
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
          decimals: token.decimals,
          blockchains: [token.blockchain],
          symbol: token.symbol,
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
