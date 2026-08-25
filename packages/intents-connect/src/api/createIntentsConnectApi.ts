import { IntentsConnectApiError, IntentsConnectError } from '@/errors';
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

export type FetchLike = (
  input: string,
  init?: {
    method?: string;
    headers?: Record<string, string>;
    body?: string;
    signal?: AbortSignal;
  },
) => Promise<{
  ok: boolean;
  status: number;
  text: () => Promise<string>;
}>;

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

const BODY_SNIPPET_LENGTH = 200;

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
  const snippet = raw.trim().slice(0, BODY_SNIPPET_LENGTH);

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

  const doFetch: FetchLike =
    fetchImpl ?? ((input, init) => globalThis.fetch(input, init));

  const request = async <T>(args: {
    path: string;
    method?: 'GET' | 'POST' | 'DELETE';
    query?: Record<string, string | undefined>;
    body?: unknown;
    withApiKey?: boolean;
  }): Promise<T> => {
    const { path, method = 'GET', query, body, withApiKey = false } = args;

    const origin = withApiKey && apiKeyProxyUrl ? apiKeyProxyUrl : baseUrl;
    const url = new URL(path, origin.endsWith('/') ? origin : `${origin}/`);

    Object.entries(query ?? {}).forEach(([key, value]) => {
      if (value !== undefined && value !== '') {
        url.searchParams.set(key, value);
      }
    });

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    // Only create calls are priced per key. Sending it elsewhere is harmless
    // but misleading, so it is scoped deliberately.
    if (withApiKey && apiKey && !apiKeyProxyUrl) {
      headers['x-api-key'] = apiKey;
    }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeout);

    let response: Awaited<ReturnType<FetchLike>>;
    let raw: string;

    try {
      response = await doFetch(url.toString(), {
        method,
        headers,
        body: body === undefined ? undefined : JSON.stringify(body),
        signal: controller.signal,
      });

      // Inside the try, and before the timer is cleared: `doFetch` resolves as
      // soon as headers arrive, so reading the body here is what keeps a server
      // that sends headers then stalls from hanging the call forever.
      raw = await response.text();
    } catch (error) {
      if (controller.signal.aborted) {
        throw new IntentsConnectError(
          `request to ${path} timed out after ${timeout}ms`,
          { cause: error },
        );
      }

      throw error;
    } finally {
      clearTimeout(timer);
    }

    // Parsed defensively and AFTER the status check below can see it: an error
    // response is frequently not JSON at all (an HTML 502 from a proxy), and
    // throwing SyntaxError here would hide the status code and make
    // `isExecutionInFlight` unreachable.
    let payload: unknown;
    let parsed = true;

    try {
      payload = raw ? JSON.parse(raw) : undefined;
    } catch {
      payload = undefined;
      parsed = false;
    }

    if (!response.ok) {
      throw new IntentsConnectApiError(
        errorMessage(payload, response.status, raw),
        response.status,
        parsed ? payload : raw,
      );
    }

    if (!parsed) {
      throw new IntentsConnectError(
        `Intents Connect API returned a non-JSON body for ${path}: ${raw
          .trim()
          .slice(0, BODY_SNIPPET_LENGTH)}`,
      );
    }

    return unwrap<T>(payload);
  };

  const encode = (value: string) => encodeURIComponent(value);

  return {
    getIntermediary: (wallet, opts) =>
      request<Intermediary>({
        path: `api/v1/executions/${encode(wallet)}/intermediary`,
        query: { publicKey: opts?.publicKey },
      }),

    createExecution: (wallet: string, body: CreateExecutionBody) =>
      request<Execution>({
        path: `api/v1/executions/${encode(wallet)}`,
        method: 'POST',
        body,
        withApiKey: true,
      }),

    createStepsExecution: (wallet: string, body: CreateStepsExecutionBody) =>
      request<Execution>({
        path: `api/v1/executions/${encode(wallet)}/steps`,
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
        path: `api/v1/executions/${encode(wallet)}/submit`,
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
        path: `api/v1/executions/${encode(wallet)}`,
        query: {
          id: query?.id,
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
        path: `api/v1/executions/${encode(wallet)}/${encode(executionId)}`,
        method: 'DELETE',
        body: signature,
      });
    },
  };
};
