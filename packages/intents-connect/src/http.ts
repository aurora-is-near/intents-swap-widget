import { IntentsConnectError } from '@/errors';

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

export type JsonRequestArgs = {
  /** Relative, without a leading slash, so a base URL's path prefix survives. */
  path: string;
  method?: 'GET' | 'POST' | 'DELETE';
  /** Undefined and empty values are skipped. */
  query?: Record<string, string | undefined>;
  headers?: Record<string, string>;
  body?: unknown;
  /** Overrides the client's base URL for this one request. */
  baseUrl?: string;
};

export type HttpErrorArgs = {
  /** The parsed body, or undefined when it was not JSON. */
  payload: unknown;
  raw: string;
  status: number;
  parsed: boolean;
};

export type JsonRequestOptions = {
  baseUrl: string;
  /** Defaults to global `fetch`, resolved at call time. */
  fetch?: FetchLike;
  /** Milliseconds. */
  timeout: number;
  /** Names the service in messages, e.g. "Intents Connect API". */
  label: string;
  /** Builds the error thrown for a non-2xx response. */
  toHttpError: (args: HttpErrorArgs) => Error;
  /** Maps a parsed 2xx body to the value returned. Defaults to identity. */
  unwrap?: (payload: unknown) => unknown;
};

const BODY_SNIPPET_LENGTH = 200;

export const bodySnippet = (raw: string): string =>
  raw.trim().slice(0, BODY_SNIPPET_LENGTH);

/**
 * The JSON-over-HTTP transport shared by every client in this package.
 *
 * Reads the body as text and parses it defensively, so an HTML error page from
 * a proxy surfaces as a status-coded error instead of a `SyntaxError`, and the
 * timeout covers the body read as well as the headers.
 */
export const createJsonRequest = (options: JsonRequestOptions) => {
  const {
    baseUrl,
    fetch: fetchImpl,
    timeout,
    label,
    toHttpError,
    unwrap = (payload) => payload,
  } = options;

  return async <T>(args: JsonRequestArgs): Promise<T> => {
    const { path, method = 'GET', query, headers, body } = args;
    const origin = args.baseUrl ?? baseUrl;
    const url = new URL(path, origin.endsWith('/') ? origin : `${origin}/`);

    Object.entries(query ?? {}).forEach(([key, value]) => {
      if (value !== undefined && value !== '') {
        url.searchParams.set(key, value);
      }
    });

    const doFetch: FetchLike =
      fetchImpl ?? ((input, init) => globalThis.fetch(input, init));

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeout);

    let response: Awaited<ReturnType<FetchLike>>;
    let raw: string;

    try {
      response = await doFetch(url.toString(), {
        method,
        headers: { 'Content-Type': 'application/json', ...headers },
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

    // Parsed defensively and BEFORE the status check so the error builder can
    // see it: an error response is frequently not JSON at all (an HTML 502 from
    // a proxy), and throwing SyntaxError here would hide the status code.
    let payload: unknown;
    let parsed = true;

    try {
      payload = raw ? JSON.parse(raw) : undefined;
    } catch {
      payload = undefined;
      parsed = false;
    }

    if (!response.ok) {
      throw toHttpError({ payload, raw, status: response.status, parsed });
    }

    if (!parsed) {
      throw new IntentsConnectError(
        `${label} returned a non-JSON body for ${path}: ${bodySnippet(raw)}`,
      );
    }

    return unwrap(payload) as T;
  };
};
