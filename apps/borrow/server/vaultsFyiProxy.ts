import { readEnv } from '../src/env.js';
import {
  DEFAULT_VAULTS_FYI_API_URL,
  VAULTS_FYI_PROXY_PATH,
} from '../src/vaultsFyiUrls.js';

export type VaultsFyiProxyOptions = {
  /** `VAULTS_FYI_API_KEY`; the proxy answers 503 while it is unset. */
  apiKey: string | undefined;
  /** The vaults.fyi API origin the calls are forwarded to. */
  upstreamUrl: string;
};

export type ProxyEnv = Record<string, string | undefined>;

/**
 * Reads the proxy's settings from a server environment (`process.env` on
 * Vercel, `loadEnv(mode, dir, '')` in dev). The key has no `VITE_` prefix so
 * Vite never inlines it into the bundle.
 */
export const vaultsFyiProxyOptions = (
  env: ProxyEnv,
): VaultsFyiProxyOptions => ({
  apiKey: readEnv(env.VAULTS_FYI_API_KEY),
  upstreamUrl: readEnv(env.VAULTS_FYI_API_URL) ?? DEFAULT_VAULTS_FYI_API_URL,
});

/** An EVM address. */
const ADDRESS = '0x[0-9a-fA-F]{40}';
/** A network name such as `base` or `arbitrum`. */
const NETWORK = '[A-Za-z0-9_-]{1,64}';
/**
 * A market id: an address or a provider's own id. No `%`, `/` or `\`, so an
 * encoded segment cannot climb out of the allow-list once decoded upstream;
 * dots only between other characters, so never `.` or `..`.
 */
const MARKET_ID = '[A-Za-z0-9_:-]+(?:\\.[A-Za-z0-9_:-]+)*';

/**
 * The only vaults.fyi borrow calls the positions reader makes (all beta,
 * read-only). Everything else is refused, so the keyed proxy is not an open
 * relay to the rest of the API.
 */
const ROUTES: readonly RegExp[] = [
  new RegExp(`^/beta/borrow/portfolio/positions/${ADDRESS}$`),
  new RegExp(
    `^/beta/borrow/portfolio/positions/${ADDRESS}/${NETWORK}/(?=.{1,128}$)${MARKET_ID}$`,
  ),
  new RegExp(`^/beta/borrow/markets/${NETWORK}$`),
  new RegExp(`^/beta/borrow/markets/${NETWORK}/(?=.{1,128}$)${MARKET_ID}$`),
];

/** The documented query parameters of those calls; others are dropped. */
export const ALLOWED_QUERY_PARAMS: readonly string[] = [
  'allowedNetworks',
  'disallowedNetworks',
  'allowedAssets',
  'disallowedAssets',
  'minUsdAssetValueThreshold',
  'sortBy',
  'sortOrder',
];

const ALLOWED_METHODS = 'GET';

/**
 * Seconds a CDN may serve a successful answer: positions refresh every
 * minute in the app, and each upstream call spends vaults.fyi credits.
 */
export const CACHE_S_MAXAGE = 30;

const SUCCESS_CACHE_CONTROL = `public, max-age=0, s-maxage=${CACHE_S_MAXAGE}, stale-while-revalidate=${CACHE_S_MAXAGE}`;

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

/** Path after the mount prefix, or `undefined` when outside it. */
const stripPrefix = (pathname: string) =>
  pathname.startsWith(`${VAULTS_FYI_PROXY_PATH}/`)
    ? pathname.slice(VAULTS_FYI_PROXY_PATH.length)
    : undefined;

const isAllowedPath = (path: string) =>
  ROUTES.some((pattern) => pattern.test(path));

/**
 * The upstream URL for an allow-listed path with only the allowed query
 * parameters, keeping any path prefix the API URL has; `undefined` when the
 * configured URL is not http(s).
 */
const upstreamFor = (
  upstreamUrl: string,
  path: string,
  query: URLSearchParams,
) => {
  let url: URL;

  try {
    url = new URL(`${upstreamUrl.replace(/\/+$/, '')}${path}`);
  } catch {
    return undefined;
  }

  if (url.protocol !== 'https:' && url.protocol !== 'http:') {
    return undefined;
  }

  url.search = '';
  ALLOWED_QUERY_PARAMS.forEach((name) =>
    query.getAll(name).forEach((value) => url.searchParams.append(name, value)),
  );

  return url;
};

/** The query parameter `vercel.json` puts the rewritten path in. */
export const REWRITE_PATH_PARAM = 'path';

/**
 * The request with its original `/api/vaults-fyi/…` path, for the Vercel
 * Edge Function. `vercel.json` rewrites `/api/vaults-fyi/:path*` to the
 * single function `/api/vaults-fyi?path=:path*`; the other query parameters
 * stay. A request already on the full path is returned as is. The handler
 * still checks the restored path against the allow-list, so a crafted `path`
 * gains nothing.
 */
export const restoreRewrittenPath = (request: Request): Request => {
  const url = new URL(request.url);

  if (url.pathname.startsWith(`${VAULTS_FYI_PROXY_PATH}/`)) {
    return request;
  }

  const path = url.searchParams.get(REWRITE_PATH_PARAM);

  if (path === null) {
    return request;
  }

  const restored = new URL(
    `${VAULTS_FYI_PROXY_PATH}/${path.replace(/^\/+/, '')}`,
    url.origin,
  );

  url.searchParams.delete(REWRITE_PATH_PARAM);
  restored.search = url.search;

  // GET only: a body on any other method is refused before it is read.
  return new Request(restored, { method: request.method });
};

/**
 * The vaults.fyi borrow proxy: adds the server-side `x-api-key` to the
 * positions reader's calls and forwards them upstream.
 *
 * - Only the four allow-listed paths are forwarded (404 otherwise), only with
 *   `GET` (405 otherwise), with the `/api/vaults-fyi` prefix stripped and only
 *   the documented query parameters kept.
 * - Nothing from the client's headers is forwarded: no `x-api-key`, cookies
 *   or authorisation.
 * - A missing key answers 503 with a JSON error. Upstream statuses and
 *   bodies are forwarded; the key is never part of a response, even if the
 *   upstream echoes it back. A success may be cached briefly by the CDN.
 *
 * Pure apart from the global `fetch`, so the Vite dev middleware and the
 * Vercel Edge Function share it.
 */
export const handleVaultsFyiProxy = async (
  request: Request,
  { apiKey, upstreamUrl }: VaultsFyiProxyOptions,
): Promise<Response> => {
  const { pathname, searchParams } = new URL(request.url);
  const path = stripPrefix(pathname);

  if (!path || !isAllowedPath(path)) {
    return jsonResponse(404, { error: 'Not found' });
  }

  if (request.method !== 'GET') {
    return jsonResponse(
      405,
      { error: 'Method not allowed' },
      { Allow: ALLOWED_METHODS },
    );
  }

  if (!apiKey) {
    console.error('vaults.fyi proxy: VAULTS_FYI_API_KEY is not set');

    return jsonResponse(503, {
      error: 'vaults.fyi is not configured on this server',
    });
  }

  const upstream = upstreamFor(upstreamUrl, path, searchParams);

  if (!upstream) {
    console.error('vaults.fyi proxy: VAULTS_FYI_API_URL is not an http(s) URL');

    return jsonResponse(500, { error: 'Internal server error' });
  }

  let response: Response;
  let text: string;

  try {
    response = await fetch(upstream, {
      method: 'GET',
      headers: { Accept: 'application/json', 'x-api-key': apiKey },
      redirect: 'manual',
      signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS),
    });
    text = await response.text();
  } catch (error) {
    // The path holds a public address and the query no secret; no key here.
    console.error(
      `vaults.fyi proxy: GET ${upstream.origin}${path} failed:`,
      error instanceof Error ? `${error.name}: ${error.message}` : error,
    );

    return jsonResponse(502, { error: 'Upstream request failed' });
  }

  if (!response.ok) {
    console.error(
      `vaults.fyi proxy: GET ${upstream.origin}${path} answered ${response.status}`,
    );
  }

  // These statuses forbid a body: `new Response('', { status: 204 })` throws.
  const hasNullBody = NULL_BODY_STATUSES.has(response.status);

  return new Response(hasNullBody ? null : text.split(apiKey).join(REDACTED), {
    status: response.status,
    headers: {
      'Content-Type':
        response.headers.get('Content-Type') ?? 'application/json',
      'Cache-Control': response.ok ? SUCCESS_CACHE_CONTROL : 'no-store',
    },
  });
};
