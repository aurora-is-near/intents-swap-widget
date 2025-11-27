import { OneClickService, TokenResponse } from '@defuse-protocol/one-click-sdk-typescript';
import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import { TOKENS_DATA } from '../config';
import { useCreator } from './useCreatorConfig';

export const getTokenIcon = (tokenSymbol: string): string => {
  const symbol = tokenSymbol.toLowerCase();

  return TOKENS_DATA[symbol]?.icon ?? '';
};

export const useTokens = () => {
  const { data: queryData, ...query } = useQuery<TokenResponse[]>({
    queryKey: ['tokens'],
    queryFn: async (): Promise<TokenResponse[]> => {
      return OneClickService.getTokens();
    },
  });

  const tokensWithIcons = useMemo(() => {
    return (queryData ?? []).map((token: any) => ({
      ...token,
      icon: getTokenIcon(token.symbol || ''),
    }));
  }, [queryData]);

  return tokensWithIcons;
};

interface Token {
  symbol: string;
  blockchain?: string;
  blockchainId?: string;
  icon: string;
}

export const isTokenAvailable = (token: Token, selectedNetworks: string[]): boolean => {
  if (!selectedNetworks || selectedNetworks.length === 0) {
    return false;
  }

  const tokenBlockchain = token.blockchain || token.blockchainId || '';
  return selectedNetworks.includes(tokenBlockchain);
};
