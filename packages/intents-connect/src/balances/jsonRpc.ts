import type { BalanceTransportOptions } from '@/balances/types';
import { IntentsConnectError } from '@/errors';
import type { FetchLike } from '@/http';

export type JsonRpcRequest = { method: string; params: unknown[] };

export type JsonRpcOutcome =
  | { ok: true; result: unknown }
  | { ok: false; error: string };

/** Every endpoint of a chain failed for transport reasons. */
export class BalanceRpcError extends IntentsConnectError {
  constructor(message: string, options?: { cause?: unknown }) {
    super(message, options);
    this.name = 'BalanceRpcError';
  }
}

const DEFAULT_TIMEOUT = 10_000;
/** Many public RPCs cap batch size; 20 is accepted everywhere we ship. */
const MAX_BATCH = 20;

type RawResponse = {
  id?: number;
  result?: unknown;
  error?: { message?: string };
};

const post = async (
  url: string,
  body: unknown,
  { fetch: fetchImpl, timeout = DEFAULT_TIMEOUT }: BalanceTransportOptions,
): Promise<unknown> => {
  const doFetch: FetchLike =
    fetchImpl ?? ((input, init) => globalThis.fetch(input, init));

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await doFetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: controller.signal,
    });

    const raw = await response.text();

    if (!response.ok) {
      throw new BalanceRpcError(`${url} responded ${response.status}`);
    }

    return JSON.parse(raw) as unknown;
  } catch (error) {
    if (error instanceof BalanceRpcError) {
      throw error;
    }

    throw new BalanceRpcError(
      controller.signal.aborted
        ? `${url} timed out after ${timeout}ms`
        : `${url} failed`,
      { cause: error },
    );
  } finally {
    clearTimeout(timer);
  }
};

const toOutcome = (response: RawResponse | undefined): JsonRpcOutcome =>
  response && response.error === undefined && 'result' in response
    ? { ok: true, result: response.result }
    : {
        ok: false,
        error: response?.error?.message ?? 'no response for this request',
      };

/** One chunk against one URL: batched, or one by one if batching is refused. */
const callChunk = async (
  url: string,
  chunk: readonly JsonRpcRequest[],
  options: BalanceTransportOptions,
): Promise<JsonRpcOutcome[]> => {
  const payload = chunk.map((request, id) => ({
    jsonrpc: '2.0',
    id,
    ...request,
  }));

  const response = await post(url, payload, options);

  if (Array.isArray(response)) {
    const byId = new Map(
      (response as RawResponse[]).map((item) => [item.id, item]),
    );

    return chunk.map((_, id) => toOutcome(byId.get(id)));
  }

  // Some endpoints answer a batch with a single error object. Retry the
  // chunk unbatched rather than failing over a working RPC.
  return Promise.all(
    payload.map(async (single) =>
      toOutcome((await post(url, single, options)) as RawResponse),
    ),
  );
};

/**
 * JSON-RPC calls in batches of `MAX_BATCH`, each batch failing over across
 * `urls` on transport errors. A per-request error (a reverted `eth_call`)
 * stays local to that request.
 */
export const jsonRpcBatch = async (
  urls: readonly string[],
  requests: readonly JsonRpcRequest[],
  options: BalanceTransportOptions = {},
): Promise<JsonRpcOutcome[]> => {
  if (!urls.length) {
    throw new BalanceRpcError('no RPC endpoint configured');
  }

  const chunks: JsonRpcRequest[][] = [];

  for (let index = 0; index < requests.length; index += MAX_BATCH) {
    chunks.push(requests.slice(index, index + MAX_BATCH));
  }

  const results = await Promise.all(
    chunks.map(async (chunk) => {
      let lastError: unknown;

      // eslint-disable-next-line no-restricted-syntax
      for (const url of urls) {
        try {
          // eslint-disable-next-line no-await-in-loop
          return await callChunk(url, chunk, options);
        } catch (error) {
          lastError = error;
        }
      }

      throw new BalanceRpcError(
        `every endpoint failed: ${
          lastError instanceof Error ? lastError.message : String(lastError)
        }`,
        { cause: lastError },
      );
    }),
  );

  return results.flat();
};
