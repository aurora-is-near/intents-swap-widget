import { base64 } from '@scure/base';

import type { FetchLike } from '@/http';
import {
  NearContractError,
  NearRpcError,
  NearUnknownAccountError,
} from '@/near/errors';

// FastNear first: rpc.mainnet.near.org is deprecated and heavily rate-limited,
// so it is kept only as the failover reserve (matching the widget's client).
export const DEFAULT_NEAR_RPC_URLS: readonly string[] = [
  'https://free.rpc.fastnear.com',
  'https://rpc.mainnet.near.org',
];

const DEFAULT_TIMEOUT = 10_000;

/**
 * Endpoints that answered 404 — an unknown key on the intents-api RPC proxy,
 * or a URL that is not an RPC at all — and until when to skip them. Bounded
 * so one stray 404 cannot retire an endpoint for the life of the page.
 */
const DEAD_URL_TTL_MS = 5 * 60_000;
const deadUrls = new Map<string, number>();

/** @internal Test isolation only. */
export const resetDeadNearRpcUrls = () => deadUrls.clear();

/** The endpoints worth trying now: every one, if all are marked dead. */
const liveUrls = (rpcUrls: readonly string[]): readonly string[] => {
  const now = Date.now();
  const live = rpcUrls.filter((url) => (deadUrls.get(url) ?? 0) <= now);

  return live.length ? live : rpcUrls;
};

export type NearRpcOptions = {
  /** Tried in order; transport failures fall through to the next one. */
  rpcUrls?: readonly string[];
  /** Defaults to global `fetch`, resolved at call time. */
  fetch?: FetchLike;
  /** Per endpoint, milliseconds. Defaults to 10_000. */
  timeout?: number;
};

type RpcErrorBody = {
  name?: string;
  cause?: { name?: string; info?: { requested_account_id?: string } };
  message?: string;
  data?: unknown;
};

/** Errors that every node would return identically — never failed over. */
const CONTRACT_ERROR_CAUSES = new Set([
  'CONTRACT_EXECUTION_ERROR',
  'NO_CONTRACT_CODE',
]);

const describeRpcError = (error: RpcErrorBody): string =>
  [error.cause?.name, error.message, JSON.stringify(error.data ?? '')]
    .filter((part) => part && part !== '""')
    .join(': ');

/**
 * `retry: false` marks an answer about the chain itself (an unknown account, a
 * contract panic): every node would say the same, so it is not failed over.
 */
type Attempt =
  | { ok: true; value: unknown }
  | { ok: false; error: Error; retry: boolean };

const attempt = async (
  url: string,
  body: string,
  options: { fetch?: FetchLike; timeout: number },
  context: { contractId?: string; methodName?: string; accountId?: string },
): Promise<Attempt> => {
  const doFetch: FetchLike =
    options.fetch ?? ((input, init) => globalThis.fetch(input, init));

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), options.timeout);

  let raw: string;
  let response: Awaited<ReturnType<FetchLike>>;

  try {
    response = await doFetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body,
      signal: controller.signal,
    });
    raw = await response.text();
  } catch (error) {
    return {
      ok: false,
      retry: true,
      error: new NearRpcError(
        controller.signal.aborted
          ? `${url} timed out after ${options.timeout}ms`
          : `${url} is unreachable`,
        { cause: error },
      ),
    };
  } finally {
    clearTimeout(timer);
  }

  if (!response.ok) {
    if (response.status === 404) {
      deadUrls.set(url, Date.now() + DEAD_URL_TTL_MS);
    }

    return {
      ok: false,
      retry: true,
      error: new NearRpcError(`${url} responded ${response.status}`),
    };
  }

  let payload: { result?: { error?: unknown }; error?: RpcErrorBody };

  try {
    payload = JSON.parse(raw) as typeof payload;
  } catch (error) {
    return {
      ok: false,
      retry: true,
      error: new NearRpcError(`${url} returned a non-JSON body`, {
        cause: error,
      }),
    };
  }

  const contractError = (message: string): Attempt => ({
    ok: false,
    retry: false,
    error: new NearContractError(
      message,
      context.contractId ?? '',
      context.methodName ?? '',
    ),
  });

  if (payload.error) {
    const causeName = payload.error.cause?.name;

    if (causeName === 'UNKNOWN_ACCOUNT') {
      return {
        ok: false,
        retry: false,
        error: new NearUnknownAccountError(
          payload.error.cause?.info?.requested_account_id ??
            context.accountId ??
            'unknown',
        ),
      };
    }

    if (causeName && CONTRACT_ERROR_CAUSES.has(causeName)) {
      return contractError(describeRpcError(payload.error));
    }

    return {
      ok: false,
      retry: true,
      error: new NearRpcError(`${url}: ${describeRpcError(payload.error)}`),
    };
  }

  // A contract panic arrives as a string inside a 200 `result`.
  if (typeof payload.result?.error === 'string') {
    return contractError(payload.result.error);
  }

  if (payload.result === undefined) {
    return {
      ok: false,
      retry: true,
      error: new NearRpcError(`${url} returned no result`),
    };
  }

  return { ok: true, value: payload.result };
};

/**
 * One NEAR JSON-RPC call with sequential failover.
 *
 * Transport failures (network, timeout, non-2xx, node errors) try the next
 * URL. Answers about the chain itself — an unknown account, a contract panic —
 * are thrown at once: every node would say the same, and failing over would
 * only turn a clear rejection into a vague "all endpoints failed".
 */
export const nearRpc = async <T>(
  args: {
    method: string;
    params: Record<string, unknown>;
    /** Labels typed errors; does not change the request. */
    context?: { contractId?: string; methodName?: string; accountId?: string };
  } & NearRpcOptions,
): Promise<T> => {
  const {
    method,
    params,
    context = {},
    rpcUrls = DEFAULT_NEAR_RPC_URLS,
    fetch,
    timeout = DEFAULT_TIMEOUT,
  } = args;

  const body = JSON.stringify({
    jsonrpc: '2.0',
    id: 'intents-connect',
    method,
    params,
  });

  const urls = liveUrls(rpcUrls);
  let lastError: Error = new NearRpcError('no NEAR RPC endpoint configured');

  // eslint-disable-next-line no-restricted-syntax
  for (const url of urls) {
    // eslint-disable-next-line no-await-in-loop
    const outcome = await attempt(url, body, { fetch, timeout }, context);

    if (outcome.ok) {
      return outcome.value as T;
    }

    if (!outcome.retry) {
      throw outcome.error;
    }

    lastError = outcome.error;
  }

  throw new NearRpcError(
    `NEAR RPC ${method} failed on every endpoint: ${lastError.message}`,
    { cause: lastError },
  );
};

const encodeArgs = (args: Record<string, unknown>): string =>
  base64.encode(new TextEncoder().encode(JSON.stringify(args)));

/**
 * A NEAR contract view call, decoded from the result bytes as JSON.
 *
 * The widget routes these through `near-api-js`' failover provider plus zod
 * decoding. Doing it with `fetch` keeps this package free of chain SDKs.
 */
export const viewCall = async <T>(
  args: {
    contractId: string;
    methodName: string;
    args: Record<string, unknown>;
    finality?: 'optimistic' | 'final';
  } & NearRpcOptions,
): Promise<T> => {
  const { contractId, methodName, finality = 'optimistic', ...options } = args;

  const result = await nearRpc<{ result?: number[] }>({
    ...options,
    method: 'query',
    params: {
      request_type: 'call_function',
      account_id: contractId,
      method_name: methodName,
      args_base64: encodeArgs(args.args),
      finality,
    },
    context: { contractId, methodName, accountId: contractId },
  });

  if (!result.result) {
    throw new NearRpcError(`no result from ${methodName} on ${contractId}`);
  }

  return JSON.parse(
    new TextDecoder().decode(new Uint8Array(result.result)),
  ) as T;
};

/** `view_account` — total yoctoNEAR, or `'0'` for an account that does not exist. */
export const getNativeNearBalance = async (
  accountId: string,
  options: NearRpcOptions = {},
): Promise<string> => {
  try {
    const account = await nearRpc<{ amount: string }>({
      ...options,
      method: 'query',
      params: {
        request_type: 'view_account',
        account_id: accountId,
        finality: 'optimistic',
      },
      context: { accountId },
    });

    return account.amount;
  } catch (error) {
    if (error instanceof NearUnknownAccountError) {
      return '0';
    }

    throw error;
  }
};
