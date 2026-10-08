import type { Chains, Token } from '@aurora-is-near/intents-swap-widget';

/**
 * CoinGecko for price history and market data. With `VITE_COINGECKO_API_KEY`
 * the key is sent (a Demo key by default, `VITE_COINGECKO_API_PLAN=pro` for a
 * Pro one); without it the free public API is used, which is rate limited
 * per IP. The key ships in the bundle, like the other client keys.
 */
const API_KEY = import.meta.env.VITE_COINGECKO_API_KEY as string | undefined;
const IS_PRO = !!API_KEY && import.meta.env.VITE_COINGECKO_API_PLAN === 'pro';

const BASE_URL = IS_PRO
  ? 'https://pro-api.coingecko.com/api/v3'
  : 'https://api.coingecko.com/api/v3';

// As a query parameter, not a header: no CORS preflight.
const KEY_PARAM = IS_PRO ? 'x_cg_pro_api_key' : 'x_cg_demo_api_key';

export class CoinGeckoError extends Error {
  constructor(readonly status: number) {
    super(`CoinGecko responded with ${status}`);
  }
}

const get = async <T>(
  path: string,
  params: Record<string, string> = {},
): Promise<T> => {
  const url = new URL(`${BASE_URL}${path}`);

  Object.entries(params).forEach(([key, value]) =>
    url.searchParams.set(key, value),
  );

  if (API_KEY) {
    url.searchParams.set(KEY_PARAM, API_KEY);
  }

  const response = await fetch(url);

  if (!response.ok) {
    throw new CoinGeckoError(response.status);
  }

  return (await response.json()) as T;
};

/** CoinGecko asset platforms for contract lookups. */
const PLATFORMS: Partial<Record<Chains, string>> = {
  eth: 'ethereum',
  base: 'base',
  arb: 'arbitrum-one',
  op: 'optimistic-ethereum',
  pol: 'polygon-pos',
  bsc: 'binance-smart-chain',
  avax: 'avalanche',
  gnosis: 'xdai',
  scroll: 'scroll',
  aurora: 'aurora',
  bera: 'berachain',
  sol: 'solana',
  near: 'near-protocol',
  tron: 'tron',
  sui: 'sui',
  ton: 'the-open-network',
};

/** Coins without a contract (natives) and common ones, by symbol. */
const COIN_IDS: Record<string, string> = {
  ETH: 'ethereum',
  BTC: 'bitcoin',
  SOL: 'solana',
  NEAR: 'near',
  AVAX: 'avalanche-2',
  BNB: 'binancecoin',
  POL: 'polygon-ecosystem-token',
  XDAI: 'xdai',
  TRX: 'tron',
  TON: 'the-open-network',
  SUI: 'sui',
  XRP: 'ripple',
  XLM: 'stellar',
  DOGE: 'dogecoin',
  LTC: 'litecoin',
  ZEC: 'zcash',
  ADA: 'cardano',
  BCH: 'bitcoin-cash',
  DASH: 'dash',
  BERA: 'berachain-bera',
  USDC: 'usd-coin',
  USDT: 'tether',
  DAI: 'dai',
};

type Coin = {
  id: string;
  name: string;
  market_data?: {
    price_change_percentage_24h?: number | null;
    market_cap?: { usd?: number };
    total_volume?: { usd?: number };
    circulating_supply?: number | null;
    ath?: { usd?: number };
    atl?: { usd?: number };
  };
};

const COIN_PARAMS = {
  localization: 'false',
  tickers: 'false',
  community_data: 'false',
  developer_data: 'false',
  sparkline: 'false',
};

const isNotFound = (error: unknown) =>
  error instanceof CoinGeckoError && error.status === 404;

const byId = (id: string) => get<Coin>(`/coins/${id}`, COIN_PARAMS);

/**
 * The token's CoinGecko coin: by contract on its chain, else a known id for
 * its symbol, else CoinGecko's own search. Null when CoinGecko doesn't list
 * it. Intents tokens resolve like the asset they stand for.
 */
export const fetchCoin = async (token: Token): Promise<Coin | null> => {
  const platform = PLATFORMS[token.blockchain];

  if (platform && token.contractAddress) {
    try {
      return await get<Coin>(
        `/coins/${platform}/contract/${token.contractAddress}`,
        COIN_PARAMS,
      );
    } catch (error) {
      if (!isNotFound(error)) {
        throw error;
      }
    }
  }

  const symbol = token.symbol.toUpperCase();
  const knownId = COIN_IDS[symbol];

  if (knownId) {
    return byId(knownId);
  }

  const { coins } = await get<{
    coins: Array<{
      id: string;
      symbol: string;
      market_cap_rank: number | null;
    }>;
  }>('/search', { query: token.symbol });

  const match = coins
    .filter((coin) => coin.symbol.toUpperCase() === symbol)
    .sort(
      (a, b) =>
        (a.market_cap_rank ?? Infinity) - (b.market_cap_rank ?? Infinity),
    )[0];

  return match ? byId(match.id) : null;
};

export type ChartRange = '1D' | '1W' | '1M' | '3M' | '1Y' | 'All';

const DAYS: Record<ChartRange, string> = {
  '1D': '1',
  '1W': '7',
  '1M': '30',
  '3M': '90',
  '1Y': '365',
  // The public and Demo APIs only serve the last year.
  All: IS_PRO ? 'max' : '365',
};

/** [timestamp ms, price USD] */
export type PricePoint = [number, number];

export const fetchChart = async (id: string, range: ChartRange) => {
  const { prices } = await get<{ prices: PricePoint[] }>(
    `/coins/${id}/market_chart`,
    { vs_currency: 'usd', days: DAYS[range] },
  );

  return prices;
};
