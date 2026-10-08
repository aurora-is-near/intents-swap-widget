import { useMemo } from 'react';

import {
  getTokenBalanceKey,
  useIntentsBalance,
  useMergedBalance,
  useTokens,
} from '@aurora-is-near/intents-swap-widget';
import type { Token } from '@aurora-is-near/intents-swap-widget';
import { formatUsdAmount } from '@aurora-is-near/intents-swap-widget/utils';

export type Asset = {
  token: Token;
  /** Atomic units. */
  balance: string;
  usd: number;
};

const toUsd = (balance: string, token: Token) =>
  (Number(BigInt(balance)) / 10 ** token.decimals) * token.price;

const byValue = (a: Asset, b: Asset) => b.usd - a.usd;

/**
 * The active account's holdings: its intents balance (what swaps and sends
 * spend) and, for a connected wallet, the wallet's own on-chain tokens.
 */
export const useAccountAssets = () => {
  const { tokens, isPending: isTokensPending } = useTokens();
  const { mergedBalance } = useMergedBalance();
  const intents = useIntentsBalance();

  const assets = useMemo(() => {
    const held = tokens.flatMap((token): Asset[] => {
      const balance = mergedBalance[getTokenBalanceKey(token)];

      if (!balance || balance === '0') {
        return [];
      }

      return [{ token, balance, usd: toUsd(balance, token) }];
    });

    return {
      account: held.filter((asset) => asset.token.isIntent).sort(byValue),
      wallet: held.filter((asset) => !asset.token.isIntent).sort(byValue),
    };
  }, [tokens, mergedBalance]);

  const all = [...assets.account, ...assets.wallet];
  const totalUsd = all.reduce((sum, asset) => sum + asset.usd, 0);
  const networks = new Set(all.map((asset) => asset.token.blockchain)).size;

  return {
    ...assets,
    totalUsd: formatUsdAmount(totalUsd),
    networks,
    isEmpty: all.length === 0,
    // Intents balances wait for the token list; both gate the first render.
    isLoading:
      isTokensPending || (intents.isPending && intents.fetchStatus !== 'idle'),
    isRefreshing: intents.isRefetching,
    refetch: intents.refetch,
  };
};
