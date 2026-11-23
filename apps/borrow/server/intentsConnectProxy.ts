import {
  DEFAULT_INTENTS_CONNECT_API_URL,
  INTENTS_CONNECT_PROXY_PATH,
} from '../src/intentsConnectUrls.js';
import { readEnv } from '../src/env.js';

export type IntentsConnectProxyOptions = {
  /** `INTENTS_CONNECT_API_KEY`; the proxy answers 500 while it is unset. */
  apiKey: string | undefined;
  /** The Intents Connect API origin the calls are forwarded to. */
  upstreamUrl: string;
};

export type ProxyEnv = Record<string, string | undefined>;

/**
 * Reads the proxy's settings from a server environment (`process.env` on
 * Vercel, `loadEnv(mode, dir, '')` in dev). The key has no `VITE_` prefix so
 * Vite never inlines it into the bundle. The upstream defaults to the
 * client's `VITE_INTENTS_CONNECT_API_URL`, so both stay on one deployment.
 */
export const intentsConnectProxyOptions = (
  env: ProxyEnv,
): IntentsConnectProxyOptions => ({
  apiKey: readEnv(env.INTENTS_CONNECT_API_KEY),
  upstreamUrl:
    readEnv(env.INTENTS_CONNECT_API_URL) ??
    readEnv(env.VITE_INTENTS_CONNECT_API_URL) ??
    DEFAULT_INTENTS_CONNECT_API_URL,
});

/**
 * One `encodeURIComponent`-ed wallet segment, captured so its decoded value
 * can be checked too (`isSafeWallet`).
 */
const WALLET = String.raw`([A-Za-z0-9\-_.!~*'()%]+)`;

/**
 * The only calls the SDK sends to `apiKeyProxyUrl`: the two create calls made
 * `withApiKey` in `createIntentsConnectApi.ts` (`createExecution` and
 * `createStepsExecution`). Everything else goes straight to the API without a
 * key, so the proxy refuses it rather than becoming an open relay.
 */
const ROUTES: ReadonlyArray<{ method: 'POST'; pattern: RegExp }> = [
  { method: 'POST', pattern: new RegExp(`^/api/v1/executions/${WALLET}$`) },
  {
    method: 'POST',
    pattern: new RegExp(`^/api/v1/executions/${WALLET}/steps$`),
  },
];

/**
 * Whether a wallet segment stays one segment once decoded. `new URL` already
 * collapses literal and `%2E` dot segments, but not `%2F` or `%5C`: an
 * upstream or gateway that decodes those before routing would otherwise see
 * `x%2F..%2F..%2Fadmin` as a keyed call outside the allow-list.
 */
const isSafeWallet = (segment: string) => {
  let decoded: string;

  try {
    decoded = decodeURIComponent(segment);
  } catch {
    return false;
  }

  return (
    !decoded.includes('/') &&
    !decoded.includes('\\') &&
    decoded !== '.' &&
    decoded !== '..'
  );
};

/** The routes `path` is on, with a wallet segment that is safe decoded. */
const routesFor = (path: string) =>
  ROUTES.filter(({ pattern }) => {
    const wallet = pattern.exec(path)?.[1];

    return wallet !== undefined && isSafeWallet(wallet);
  });

/** Create bodies are small JSON documents; anything far larger is refused. */
export const MAX_BODY_BYTES = 256 * 1024;

const UPSTREAM_TIMEOUT_MS = 20_000;

const REDACTED = '[redacted]';

const NULL_BODY_STATUSES: ReadonlySet<number> = new Set([204, 205, 304]);

const jsonResponse = (
  status: number,
  body: { error: string },
  headers: Record<string, string> = {},
) =>
  new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-store',
      ...headers,
    },
  });

/** Reads the body up to the limit; `undefined` means it was exceeded. */
const readBoundedBody = async (
  request: Request,
): Promise<string | undefined> => {
  if (!request.body) {
    return '';
  }

  const reader = request.body.getReader();
  const decoder = new TextDecoder();
  let body = '';
  let bytes = 0;

  // Recursive rather than a loop: each chunk is read after the previous one.
  const readRest = async (): Promise<string | undefined> => {
    const { done, value } = await reader.read();

    if (done) {
      return body + decoder.decode();
    }

    // Node streams adapted with `Readable.toWeb` (the dev middleware) may
    // yield strings rather than bytes.
    const chunk: Uint8Array =
      typeof value === 'string' ? new TextEncoder().encode(value) : value;

    bytes += chunk.byteLength;

    if (bytes > MAX_BODY_BYTES) {
      await reader.cancel();

      return undefined;
    }

    body += decoder.decode(chunk, { stream: true });

    return readRest();
  };

  return readRest();
};

const isJson = (text: string) => {
  try {
    JSON.parse(text);

    return true;
  } catch {
    return false;
  }
};

/** Path after the mount prefix, or `undefined` when outside it. */
const stripPrefix = (pathname: string) =>
  pathname.startsWith(`${INTENTS_CONNECT_PROXY_PATH}/`)
    ? pathname.slice(INTENTS_CONNECT_PROXY_PATH.length)
    : undefined;

/**
 * The upstream URL for an allow-listed path, keeping any path prefix the API
 * URL has; `undefined` when the configured URL is not http(s).
 */
const upstreamFor = (upstreamUrl: string, path: string) => {
  try {
    const url = new URL(`${upstreamUrl.replace(/\/+$/, '')}${path}`);

    return url.protocol === 'https:' || url.protocol === 'http:'
      ? url
      : undefined;
  } catch {
    return undefined;
  }
};

/** The query parameter `vercel.json` puts the rewritten path in. */
export const REWRITE_PATH_PARAM = 'path';

/**
 * The request with its original `/api/intents-connect/…` path, for the Vercel
 * Edge Function. `vercel.json` rewrites `/api/intents-connect/:path*` to the
 * single function `/api/intents-connect?path=:path*`, because catch-all files
 * in `api/` are not reliably routed outside Next.js. A request already on the
 * full path is returned as is. The handler still checks the restored path
 * against the allow-list, so a crafted `path` gains nothing.
 */
export const restoreRewrittenPath = (request: Request): Request => {
  const url = new URL(request.url);

  if (url.pathname.startsWith(`${INTENTS_CONNECT_PROXY_PATH}/`)) {
    return request;
  }

  const path = url.searchParams.get(REWRITE_PATH_PARAM);

  if (path === null) {
    return request;
  }

  const restored = new URL(
    `${INTENTS_CONNECT_PROXY_PATH}/${path.replace(/^\/+/, '')}`,
    url.origin,
  );

  return new Request(restored, {
    method: request.method,
    body: request.body,
    duplex: 'half',
  } as RequestInit);
};

/**
 * The Intents Connect API-key proxy: adds the server-side `x-api-key` to the
 * SDK's create calls and forwards them upstream.
 *
 * - Only the allow-listed paths (404) and methods (405) are forwarded, with
 *   the `/api/intents-connect` prefix stripped and the query dropped.
 * - Nothing from the client's headers is forwarded: no `x-api-key`, cookies
 *   or authorisation. The upstream sees a fresh JSON request.
 * - A missing key, a bad upstream URL or a failed upstream call answer a
 *   generic error. The key is never part of a response: it is redacted even
 *   if the upstream echoes it back.
 *
 * Pure apart from the global `fetch`, so the Vite dev middleware and the
 * Vercel Edge Function share it.
 */
export const handleIntentsConnectProxy = async (
  request: Request,
  { apiKey, upstreamUrl }: IntentsConnectProxyOptions,
): Promise<Response> => {
  const { pathname } = new URL(request.url);
  const path = stripPrefix(pathname);
  const routes = path ? routesFor(path) : [];

  if (!path || routes.length === 0) {
    return jsonResponse(404, { error: 'Not found' });
  }

  if (!routes.some(({ method }) => method === request.method)) {
    return jsonResponse(
      405,
      { error: 'Method not allowed' },
      { Allow: [...new Set(routes.map(({ method }) => method))].join(', ') },
    );
  }

  const upstream = upstreamFor(upstreamUrl, path);

  if (!apiKey || !upstream) {
    // Logged for whoever runs the server; the caller learns nothing.
    console.error(
      apiKey
        ? 'Intents Connect proxy: INTENTS_CONNECT_API_URL is not an http(s) URL'
        : 'Intents Connect proxy: INTENTS_CONNECT_API_KEY is not set',
    );

    return jsonResponse(500, { error: 'Internal server error' });
  }

  const body = await readBoundedBody(request);

  if (body === undefined) {
    return jsonResponse(413, { error: 'Request body too large' });
  }

  if (!isJson(body)) {
    return jsonResponse(400, { error: 'Request body must be JSON' });
  }

  let response: Response;
  let text: string;

  try {
    response = await fetch(upstream, {
      method: request.method,
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        'x-api-key': apiKey,
      },
      body,
      redirect: 'manual',
      signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS),
    });
    text = await response.text();
  } catch (error) {
    console.error(
      `Intents Connect proxy: ${request.method} ${upstream.origin}${path} failed:`,
      error instanceof Error ? `${error.name}: ${error.message}` : error,
    );

    return jsonResponse(502, { error: 'Upstream request failed' });
  }

  // These statuses forbid a body: `new Response('', { status: 204 })` throws.
  const hasNullBody = NULL_BODY_STATUSES.has(response.status);

  return new Response(hasNullBody ? null : text.split(apiKey).join(REDACTED), {
    status: response.status,
    headers: {
      'Content-Type':
        response.headers.get('Content-Type') ?? 'application/json',
      'Cache-Control': 'no-store',
    },
  });
};
