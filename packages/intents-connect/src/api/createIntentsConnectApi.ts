import { IntentsConnectApiError } from '@/errors';
import { bodySnippet, createJsonRequest, type FetchLike } from '@/http';
import type { Execution, Intermediary, SubmitStatus } from '@/types/execution';
import type { DeleteSignatureEnvelope } from '@/types/signing';
import type {
  CreateExecutionBody,
  CreateStepsExecutionBody,
  IntentsConnectApi,
  ListExecutionsQuery,
  RecordDepositBody,
  SubmitSignatureBody,
  SupportedTokensFlow,
  SupportedTokensResult,
} from '@/api/types';

export type { FetchLike };

export type IntentsConnectApiOptions = {
  baseUrl: string;
  /**
   * Sent as `x-api-key` on create calls.
   *
   * Prefer `apiKeyProxyUrl` in a browser: the key prices per-key fees
   * server-side and should not ship in client code.
   */
  apiKey?: string;
  /**
   * Base URL of your own server that injects `x-api-key` and forwards to the
   * Intents Connect API. When set, create calls go here instead of `baseUrl`.
   */
  apiKeyProxyUrl?: string;
  /** Defaults to global `fetch`. */
  fetch?: FetchLike;
  /** Milliseconds. Defaults to 30_000. */
  timeout?: number;
};

const DEFAULT_TIMEOUT = 30_000;

/** Responses are wrapped as `{ result: … }`; tolerate a bare body too. */
const unwrap = <T>(payload: unknown): T => {
  if (payload && typeof payload === 'object' && 'result' in payload) {
    return (payload as { result: T }).result;
  }

  return payload as T;
};

const errorMessage = (
  payload: unknown,
  status: number,
  raw: string,
): string => {
  if (payload && typeof payload === 'object' && 'error' in payload) {
    const { error } = payload as { error: unknown };

    if (typeof error === 'string') {
      return error;
    }
  }

  // A non-JSON body is usually a proxy or CDN error page rather than the API.
  // Including a snippet is the difference between a debuggable failure and an
  // opaque status code.
  const snippet = bodySnippet(raw);

  return snippet
    ? `Intents Connect API responded ${status}: ${snippet}`
    : `Intents Connect API responded ${status}`;
};

export const createIntentsConnectApi = (
  options: IntentsConnectApiOptions,
): IntentsConnectApi => {
  const {
    baseUrl,
    apiKey,
    apiKeyProxyUrl,
    fetch: fetchImpl,
    timeout = DEFAULT_TIMEOUT,
  } = options;

  const send = createJsonRequest({
    baseUrl,
    fetch: fetchImpl,
    timeout,
    label: 'Intents Connect API',
    // A non-JSON error body must still surface its status, or
    // `isExecutionInFlight` becomes unreachable behind a proxy's HTML 502.
    toHttpError: ({ payload, raw, status, parsed }) =>
      new IntentsConnectApiError(
        errorMessage(payload, status, raw),
        status,
        parsed ? payload : raw,
      ),
    unwrap,
  });

  const request = <T>(args: {
    path: string;
    method?: 'GET' | 'POST' | 'DELETE';
    query?: Record<string, string | undefined>;
    body?: unknown;
    withApiKey?: boolean;
  }): Promise<T> => {
    const { withApiKey = false, ...rest } = args;
    const headers: Record<string, string> = {};

    // Only create calls are priced per key. Sending it elsewhere is harmless
    // but misleading, so it is scoped deliberately.
    if (withApiKey && apiKey && !apiKeyProxyUrl) {
      headers['x-api-key'] = apiKey;
    }

    return send<T>({
      ...rest,
      headers,
      baseUrl: withApiKey && apiKeyProxyUrl ? apiKeyProxyUrl : undefined,
    });
  };

  return {
    getIntermediary: (wallet, opts) =>
      request<Intermediary>({
        path: `api/v1/executions/${encodeURIComponent(wallet)}/intermediary`,
        query: { publicKey: opts?.publicKey },
      }),

    createExecution: (wallet: string, body: CreateExecutionBody) =>
      request<Execution>({
        path: `api/v1/executions/${encodeURIComponent(wallet)}`,
        method: 'POST',
        body,
        withApiKey: true,
      }),

    createStepsExecution: (wallet: string, body: CreateStepsExecutionBody) =>
      request<Execution>({
        path: `api/v1/executions/${encodeURIComponent(wallet)}/steps`,
        method: 'POST',
        body,
        withApiKey: true,
      }),

    listSupportedTokens: (flow?: SupportedTokensFlow) =>
      request<SupportedTokensResult>({
        path: 'api/v1/supported_tokens',
        query: { flow },
      }),

    submitSignature: (wallet: string, body: SubmitSignatureBody) =>
      request<{ status: SubmitStatus }>({
        path: `api/v1/executions/${encodeURIComponent(wallet)}/submit`,
        method: 'POST',
        body,
      }),

    recordDeposit: async (body: RecordDepositBody) => {
      await request<unknown>({
        path: 'api/v1/executions/deposit/submit',
        method: 'POST',
        body,
      });
    },

    listExecutions: async (wallet: string, query?: ListExecutionsQuery) => {
      const result = await request<Execution[] | Execution>({
        path: `api/v1/executions/${encodeURIComponent(wallet)}`,
        query: {
          id: query?.id,
          // The cast is required: `Array.isArray` narrows to `any[]`, which a
          // `readonly ExecutionStatus[]` is not assignable to, so the false
          // branch keeps the array member of the union.
          status: Array.isArray(query?.status)
            ? query.status.join(',')
            : (query?.status as string | undefined),
        },
      });

      return Array.isArray(result) ? result : [result].filter(Boolean);
    },

    deleteExecution: async (
      wallet: string,
      executionId: string,
      signature: DeleteSignatureEnvelope,
    ) => {
      await request<unknown>({
        path: `api/v1/executions/${encodeURIComponent(wallet)}/${encodeURIComponent(executionId)}`,
        method: 'DELETE',
        body: signature,
      });
    },
  };
};
