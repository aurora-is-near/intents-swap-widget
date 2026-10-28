import { useEffect, useMemo } from 'react';
import { useInfiniteQuery } from '@tanstack/react-query';

import { fireEvent } from '@/machine';
import { useTokens } from '@/hooks/useTokens';
import { guardStates } from '@/machine/guards';
import { useUnsafeSnapshot } from '@/machine/snap';
import { useWalletBalance } from '@/hooks/useWalletBalance';
import { getTokenBalanceKey } from '@/utils/intents/getTokenBalanceKey';
import { parse } from './parse';
import { createLoader } from './load';
import { useConfig } from '../../config';
import { getSupportedChains } from '../../utils/chains/getSupportedChains';
import { isAlchemySupportedChain } from './types';
import type { AlchemyResponse } from './types';
import type { Chains, WalletAddresses } from '../../types';

type Args = {
  isEnabled: boolean;
  alchemyApiKey: string;
  connectedWallets: WalletAddresses;
};

const MAX_PAGES_DEPTH = 3;

export const useAlchemyBalanceIntegration = ({
  connectedWallets,
  alchemyApiKey,
  ...args
}: Args) => {
  const { ctx } = useUnsafeSnapshot();

  const { tokens } = useTokens();
  const { walletSupportedChains } = useConfig();
  const { setWalletBalance } = useWalletBalance(connectedWallets);

  // Balances are fetched for every connected wallet, so derive chains from all
  // of them rather than from the source token's wallet (`useSupportedChains`),
  // which covers a single wallet only (e.g. just EVM for `{ default, sol }`).
  const supportedChains = useMemo(
    () => [
      ...new Set(
        Object.values(connectedWallets)
          .filter((address): address is string => !!address)
          .flatMap((walletAddress): readonly Chains[] =>
            getSupportedChains({ walletAddress, walletSupportedChains }),
          ),
      ),
    ],
    [connectedWallets, walletSupportedChains],
  );

  const isEnabled =
    args.isEnabled &&
    !!Object.values(connectedWallets).length &&
    supportedChains.length > 0;

  const query = useInfiniteQuery<AlchemyResponse>({
    initialPageParam: null,
    enabled: !!isEnabled && !!alchemyApiKey,
    queryKey: ['walletTokensBalance', connectedWallets, supportedChains],
    queryFn: async ({ pageParam }) => {
      return createLoader({ alchemyApiKey })({
        pageParam: pageParam ? `${pageParam as string}` : null,
        connectedWallets,
        supportedChains,
      });
    },
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

      const balanceKey = getTokenBalanceKey(token);

      if (inAllowed && !(balanceKey in balances)) {
        balances[balanceKey] = '0';
      }
    });

    return balances;
  }, [query.data, tokens]);

  useEffect(() => {
    // Store balances regardless of the machine state: the machine leaves
    // `initial_wallet` once a quote runs or a source token from another
    // wallet's chain is picked, and refetches must still reach the cache.
    setWalletBalance(connectedWallets, balancesMap);

    if (guardStates(ctx, ['initial_wallet'])) {
      const sourceKey = ctx.sourceToken
        ? getTokenBalanceKey(ctx.sourceToken)
        : undefined;

      if (sourceKey && Object.keys(balancesMap).includes(sourceKey)) {
        fireEvent('tokenSetBalance', balancesMap[sourceKey]);
      }
    }
  }, [balancesMap]);

  return {
    status: query.status,
    refetch: query.refetch,
    balances: balancesMap,
  };
};
