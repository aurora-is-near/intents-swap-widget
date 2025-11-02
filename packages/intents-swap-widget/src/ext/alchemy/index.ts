import { useEffect, useMemo } from 'react';
import { useInfiniteQuery } from '@tanstack/react-query';

import { parse } from './parse';
import { createLoader } from './load';
import { isAlchemySupportedChain } from './types';
import type { AlchemyResponse } from './types';
import { useConfig } from '@/config';
import { fireEvent } from '@/machine';
import { useTokens } from '@/hooks/useTokens';
import { guardStates } from '@/machine/guards';
import { useUnsafeSnapshot } from '@/machine/snap';
import { useWalletBalance } from '@/hooks/useWalletBalance';

type Args = {
  isEnabled: boolean;
  alchemyApiKey: string;
  walletAddress: string | null | undefined;
};

const MAX_PAGES_DEPTH = 3;

export const useAlchemyBalanceIntegration = ({
  walletAddress,
  alchemyApiKey,
  ...args
}: Args) => {
  const { ctx } = useUnsafeSnapshot();

  const { tokens } = useTokens();
  const { walletSupportedChains } = useConfig();
  const { setWalletBalance } = useWalletBalance(ctx.walletAddress);

  const isEnabled =
    args.isEnabled && !!walletAddress && walletSupportedChains.length > 0;

  const query = useInfiniteQuery<AlchemyResponse>({
    initialPageParam: null,
    enabled: isEnabled && !!walletAddress && !!alchemyApiKey,
    queryKey: ['walletTokensBalance', walletAddress],
    queryFn: async ({ pageParam }) =>
      createLoader({ alchemyApiKey })({
        pageParam: pageParam ? `${pageParam as string}` : null,
        walletAddress,
        walletSupportedChains,
      }),
    getNextPageParam: (lastPage, allPages) => {
      if (!lastPage.pageKey) {
        return undefined;
      }

      if (allPages.length >= MAX_PAGES_DEPTH) {
        return undefined;
      }

      return lastPage.pageKey;
    },
  });

  useEffect(() => {
    if (
      isEnabled &&
      query.data &&
      query.hasNextPage &&
      query.data.pages.length < MAX_PAGES_DEPTH &&
      !query.isFetchingNextPage
    ) {
      // void since error will be raised via queryFn
      void query.fetchNextPage();
    }
  }, [isEnabled, query]);

  const balancesMap = useMemo(() => {
    if (!query.data?.pages) {
      return {};
    }

    const balances = parse(
      tokens,
      query.data.pages.flatMap((page) => page.data),
    );

    // Fill missing tokens for allowed chains with zero
    tokens.forEach((token) => {
      const inAllowed = isAlchemySupportedChain(token.blockchain);

      if (inAllowed && !(token.assetId in balances)) {
        balances[token.assetId] = '0';
      }
    });

    return balances;
  }, [query.data, tokens]);

  useEffect(() => {
    const validState = guardStates(ctx, ['initial_wallet']);

    if (validState) {
      setWalletBalance(ctx.walletAddress, balancesMap);

      if (
        ctx.sourceToken &&
        Object.keys(balancesMap).includes(ctx.sourceToken.assetId)
      ) {
        fireEvent('tokenSetBalance', balancesMap[ctx.sourceToken.assetId]);
      }
    }
  }, [balancesMap]);

  return {
    status: query.status,
    refetch: query.refetch,
    balances: balancesMap,
  };
};
