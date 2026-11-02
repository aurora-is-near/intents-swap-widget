import type { FetchLike } from '@/http';
import type { OwnershipProof } from '@/ownership/types';

export type IntentsApiOptions = {
  /** API key issued at https://studio.aurora.dev — sent in the URL path. */
  apiKey: string;
  /** Defaults to `https://intents-api.aurora.dev`. */
  baseUrl?: string;
  /** Defaults to global `fetch`. */
  fetch?: FetchLike;
  /** Milliseconds. Defaults to 15_000. */
  timeout?: number;
};

/** One entry of `GET /api/tokens/:apiKey`. */
export type IntentsApiToken = {
  /** 1Click asset id, e.g. `nep141:wrap.near`. */
  assetId: string;
  symbol: string;
  /** 1Click chain slug, e.g. `eth`, `base`, `sol`, `near`. */
  blockchain: string;
  decimals: number;
  /** USD price. */
  price: number;
  priceUpdatedAt?: string;
  /** Absent for a chain's native asset. */
  contractAddress?: string;
};

export type IntentsApiAssetStat = {
  token_id: string;
  blockchain: string;
  symbol: string;
  volume_amount_usd: string;
};

export type GetTokensResult = {
  tokens: IntentsApiToken[];
  asset_stats: IntentsApiAssetStat[];
};

export type IntentsAccountBalance = {
  tokenId: string;
  assetId: string;
  symbol: string | null;
  decimals: number | null;
  /** Smallest unit. */
  amount: string;
};

export type GetIntentsAccountBalancesResult = {
  /** NEAR block height the balances were read at. */
  blockHeight: number;
  /** Non-zero balances only. */
  balances: IntentsAccountBalance[];
};

export type AuthenticateResult = {
  accessToken: string;
  refreshToken: string;
  /** Seconds. */
  expiresIn: number;
  /** Seconds. */
  refreshExpiresIn: number;
};

export type RefreshAccessTokenResult = {
  accessToken: string;
  /** Seconds. The refresh token does not rotate. */
  expiresIn: number;
};

export type ConfidentialBalance = {
  tokenId: string;
  /** Smallest unit. */
  available: string;
  /** `private` today; typed open so a new source does not break callers. */
  source: string;
};

export type GetConfidentialBalancesResult = {
  balances: ConfidentialBalance[];
};

export type IntentsApi = {
  readonly apiKey: string;
  readonly baseUrl: string;
  /** NEAR JSON-RPC proxy, rate-limited per API key. */
  readonly nearRpcUrl: string;

  getTokens: () => Promise<GetTokensResult>;
  /** Public balances held by an intents account on `intents.near`. */
  getIntentsAccountBalances: (
    intentsAccountId: string,
  ) => Promise<GetIntentsAccountBalancesResult>;
  /** Exchanges a signed ownership proof for a user session. */
  authenticate: (proof: OwnershipProof) => Promise<AuthenticateResult>;
  refreshAccessToken: (
    refreshToken: string,
  ) => Promise<RefreshAccessTokenResult>;
  /** Confidential (private) balances of the session's user. */
  getConfidentialBalances: (
    accessToken: string,
    tokenIds?: readonly string[],
  ) => Promise<GetConfidentialBalancesResult>;
};
