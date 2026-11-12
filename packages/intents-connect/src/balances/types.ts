import type { FetchLike } from '@/http';
import type { IntentsApiToken } from '@/intentsApi/types';

/** A token whose wallet balance can be read. */
export type BalanceToken = Pick<
  IntentsApiToken,
  'assetId' | 'symbol' | 'blockchain' | 'decimals' | 'contractAddress' | 'price'
>;

/** Per-chain RPC endpoints, tried in order. Keys are 1Click chain slugs. */
export type ChainRpcUrls = Partial<Record<string, readonly string[]>>;

export type WalletBalances = {
  /**
   * Smallest-unit balances keyed by asset id. Includes zeros for tokens that
   * were read; a token missing from the map could not be read.
   */
  balances: Record<string, string>;
  /**
   * Chains that could not be read, fully or partly (e.g. SOL read but SPL
   * tokens refused by the endpoint), keyed by chain slug.
   */
  errors: Record<string, Error>;
};

export type BalanceTransportOptions = {
  /** Defaults to global `fetch`, resolved at call time. */
  fetch?: FetchLike;
  /** Per request, milliseconds. */
  timeout?: number;
};
