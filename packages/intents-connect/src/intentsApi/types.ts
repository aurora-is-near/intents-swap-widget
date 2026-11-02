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

/** The NEAR Intents rails a 1Click swap can take funds from or pay out to. */
export type IntentsRail = 'INTENTS' | 'CONFIDENTIAL_INTENTS';

/**
 * `POST /api/quote/:apiKey` — a 1Click quote request. The intents API adds the
 * integration's app fees and referral itself.
 */
export type SwapQuoteRequest = {
  /** `true` previews without a deposit address. */
  dry: boolean;
  swapType: 'EXACT_INPUT' | 'EXACT_OUTPUT' | 'FLEX_INPUT';
  /** Basis points: 100 = 1%. */
  slippageTolerance: number;
  originAsset: string;
  /**
   * `INTENTS` / `CONFIDENTIAL_INTENTS`: the deposit address is an intents
   * account, funded by a signed transfer intent (`generateIntent`).
   */
  depositType: 'ORIGIN_CHAIN' | IntentsRail;
  depositMode?: 'SIMPLE' | 'MEMO';
  destinationAsset: string;
  /** Smallest unit; input or output depending on `swapType`. */
  amount: string;
  refundTo: string;
  refundType: 'ORIGIN_CHAIN' | IntentsRail;
  recipient: string;
  recipientType: 'DESTINATION_CHAIN' | IntentsRail;
  /** ISO 8601. */
  deadline: string;
  /** Settlement rails; `public` by default. */
  confidentiality?: 'public' | 'basic' | 'advanced';
  /** `0` asks for the fastest available quote. */
  quoteWaitingTimeMs?: number;
  connectedWallets?: string[];
  sessionId?: string;
};

export type SwapQuote = {
  /** Absent on a dry quote. */
  depositAddress?: string;
  depositMemo?: string;
  amountIn: string;
  amountInFormatted?: string;
  amountInUsd?: string;
  minAmountIn: string;
  amountOut: string;
  amountOutFormatted?: string;
  amountOutUsd?: string;
  minAmountOut: string;
  /** ISO 8601 — when a deposit is refunded rather than swapped. */
  deadline?: string;
  /** ISO 8601 — when the deposit address stops being watched. */
  timeWhenInactive?: string;
  /** Seconds. */
  timeEstimate: number;
  refundFee?: string;
  withdrawFee?: string;
};

export type SwapQuoteResponse = {
  correlationId: string;
  timestamp: string;
  signature: string;
  quoteRequest: SwapQuoteRequest & {
    appFees?: { recipient: string; fee: number }[];
    referral?: string;
  };
  quote: SwapQuote;
};

/**
 * An intent 1Click prepared for the user to sign — the transfer that funds a
 * quote from an intents (or confidential) account.
 */
export type PreparedIntent =
  | {
      standard: 'nep413';
      payload: {
        message: string;
        nonce: string;
        recipient: string;
        callbackUrl?: string | null;
      };
    }
  | {
      standard: 'erc191' | 'raw_ed25519' | 'sep53' | 'webauthn';
      payload: string;
    };

export type PreparedIntentStandard = PreparedIntent['standard'];

export type GenerateIntentRequest = {
  type: 'swap_transfer';
  standard: PreparedIntentStandard;
  /** The intents account id that signs (and holds the funds). */
  signerId: string;
  /** The quote's deposit address — the transfer's receiver. */
  depositAddress: string;
};

export type GenerateIntentResult = {
  intent: PreparedIntent;
  correlationId: string;
};

/** A signed intent: the same `MultiPayload` shapes as an ownership proof. */
export type SignedIntent = OwnershipProof;

export type SubmitIntentRequest = {
  type: 'swap_transfer';
  signedData: SignedIntent;
};

export type SubmitIntentResult = {
  intentHash: string;
  correlationId: string;
};

export type SwapStatus =
  | 'KNOWN_DEPOSIT_TX'
  | 'PENDING_DEPOSIT'
  | 'INCOMPLETE_DEPOSIT'
  | 'PROCESSING'
  | 'SUCCESS'
  | 'REFUNDED'
  | 'FAILED';

export type SwapDetails = {
  intentHashes: string[];
  nearTxHashes: string[];
  amountIn?: string;
  amountOut?: string;
  refundedAmount?: string;
  refundReason?: string;
  depositedAmount?: string;
  withdrawFee?: string;
  originChainTxHashes?: { hash: string; explorerUrl: string }[];
  destinationChainTxHashes?: { hash: string; explorerUrl: string }[];
};

/**
 * `GET /api/status/:apiKey`. A swap settled on confidential rails reports
 * its `status` only.
 */
export type SwapStatusResult = {
  status: SwapStatus;
  correlationId?: string;
  updatedAt?: string;
  quoteResponse?: SwapQuoteResponse;
  swapDetails?: SwapDetails;
};

/** The user's session token, for calls on a confidential account. */
export type UserTokenOptions = { accessToken?: string };

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
  /** A 1Click quote, with the integration's fees applied. */
  getQuote: (body: SwapQuoteRequest) => Promise<SwapQuoteResponse>;
  /** The transfer intent that funds an `INTENTS` / `CONFIDENTIAL_INTENTS` quote. */
  generateIntent: (
    body: GenerateIntentRequest,
    options?: UserTokenOptions,
  ) => Promise<GenerateIntentResult>;
  submitIntent: (
    body: SubmitIntentRequest,
    options?: UserTokenOptions,
  ) => Promise<SubmitIntentResult>;
  /** 1Click's progress for a quote, by its deposit address. */
  getSwapStatus: (
    query: { depositAddress: string; depositMemo?: string },
    options?: UserTokenOptions,
  ) => Promise<SwapStatusResult>;
};
