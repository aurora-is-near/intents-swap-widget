import { IntentsApiError } from '@/errors';
import { bodySnippet, createJsonRequest } from '@/http';
import type {
  AuthenticateResult,
  GenerateIntentResult,
  GetConfidentialBalancesResult,
  GetIntentsAccountBalancesResult,
  GetTokensResult,
  IntentsApi,
  IntentsApiOptions,
  RefreshAccessTokenResult,
  SubmitIntentResult,
  SwapQuoteResponse,
  SwapStatusResult,
} from '@/intentsApi/types';

export const DEFAULT_INTENTS_API_URL = 'https://intents-api.aurora.dev';

const DEFAULT_TIMEOUT = 15_000;

/** Sent only with a token: the partner key in the path covers the rest. */
const bearer = (accessToken: string | undefined) =>
  accessToken ? { Authorization: `Bearer ${accessToken}` } : undefined;

/**
 * Fee-service errors are `{ statusCode, error, message }` (`error` is only the
 * reason phrase) and 1Click pass-through errors are `{ message, correlationId }`,
 * so `message` carries the detail in both.
 */
const errorMessage = (
  payload: unknown,
  status: number,
  raw: string,
): string => {
  if (payload && typeof payload === 'object') {
    const { message, error } = payload as {
      message?: unknown;
      error?: unknown;
    };

    if (typeof message === 'string' && message) {
      return message;
    }

    if (typeof error === 'string' && error) {
      return error;
    }
  }

  const snippet = bodySnippet(raw);

  return snippet
    ? `Intents API responded ${status}: ${snippet}`
    : `Intents API responded ${status}`;
};

/**
 * Client for the Aurora intents API (`intents-api.aurora.dev`): tokens, public
 * intents balances, user sessions and confidential balances, and 1Click swaps
 * funded from intents — quote, the transfer intent to sign, and status.
 *
 * The API key travels in the URL path, as it does for the swap widget — it
 * identifies the integration and is rate-limited, but is not a secret.
 */
export const createIntentsApi = (options: IntentsApiOptions): IntentsApi => {
  const {
    apiKey,
    baseUrl = DEFAULT_INTENTS_API_URL,
    fetch: fetchImpl,
    timeout = DEFAULT_TIMEOUT,
  } = options;

  const request = createJsonRequest({
    baseUrl,
    fetch: fetchImpl,
    timeout,
    label: 'Intents API',
    toHttpError: ({ payload, raw, status, parsed }) =>
      new IntentsApiError(
        errorMessage(payload, status, raw),
        status,
        parsed ? payload : raw,
      ),
  });

  const key = encodeURIComponent(apiKey);
  const origin = baseUrl.replace(/\/+$/, '');

  return {
    apiKey,
    baseUrl,
    nearRpcUrl: `${origin}/rpc/${key}`,

    getTokens: () => request<GetTokensResult>({ path: `api/tokens/${key}` }),

    getIntentsAccountBalances: (intentsAccountId) =>
      request<GetIntentsAccountBalancesResult>({
        path: `api/intents-account/balances/${key}`,
        query: { intentsAccountId },
      }),

    authenticate: (proof) =>
      request<AuthenticateResult>({
        path: `api/auth/authenticate/${key}`,
        method: 'POST',
        body: { signedData: proof },
      }),

    refreshAccessToken: (refreshToken) =>
      request<RefreshAccessTokenResult>({
        path: `api/auth/refresh/${key}`,
        method: 'POST',
        body: { refreshToken },
      }),

    getConfidentialBalances: (accessToken, tokenIds) =>
      request<GetConfidentialBalancesResult>({
        path: `api/account/balances/${key}`,
        query: { tokenIds: tokenIds?.length ? tokenIds.join(',') : undefined },
        headers: bearer(accessToken),
      }),

    getQuote: (body) =>
      request<SwapQuoteResponse>({
        path: `api/quote/${key}`,
        method: 'POST',
        body,
      }),

    generateIntent: (body, { accessToken } = {}) =>
      request<GenerateIntentResult>({
        path: `api/generate-intent/${key}`,
        method: 'POST',
        body,
        headers: bearer(accessToken),
      }),

    submitIntent: (body, { accessToken } = {}) =>
      request<SubmitIntentResult>({
        path: `api/submit-intent/${key}`,
        method: 'POST',
        body,
        headers: bearer(accessToken),
      }),

    getSwapStatus: ({ depositAddress, depositMemo }, { accessToken } = {}) =>
      request<SwapStatusResult>({
        path: `api/status/${key}`,
        query: { depositAddress, depositMemo },
        headers: bearer(accessToken),
      }),
  };
};
