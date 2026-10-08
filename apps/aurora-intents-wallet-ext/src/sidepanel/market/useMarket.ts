import { useQuery } from '@tanstack/react-query';
import type { Token } from '@aurora-is-near/intents-swap-widget';

import { CoinGeckoError, fetchChart, fetchCoin } from './coingecko';
import type { ChartRange } from './coingecko';

const MINUTE = 60_000;

// Rate limits (429) and misses (404) don't get better by retrying at once.
const retry = (count: number, error: unknown) =>
  count < 1 &&
  !(error instanceof CoinGeckoError && [404, 429].includes(error.status));

/** The token's CoinGecko coin with market data; null when it isn't listed. */
export const useCoin = (token: Token) =>
  useQuery({
    queryKey: [
      'coingecko',
      'coin',
      token.blockchain,
      token.contractAddress ?? token.symbol,
    ],
    queryFn: () => fetchCoin(token),
    staleTime: 5 * MINUTE,
    gcTime: 30 * MINUTE,
    retry,
  });

export const usePriceChart = (coinId: string | undefined, range: ChartRange) =>
  useQuery({
    queryKey: ['coingecko', 'chart', coinId, range],
    queryFn: () => fetchChart(coinId ?? '', range),
    enabled: !!coinId,
    staleTime: (range === '1D' ? 2 : 30) * MINUTE,
    gcTime: 30 * MINUTE,
    retry,
  });
