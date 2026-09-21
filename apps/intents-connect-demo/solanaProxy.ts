import type { IncomingMessage, ServerResponse } from 'node:http';
import { Readable } from 'node:stream';
import type { Plugin } from 'vite';

export type ProxyEnv = Record<string, string | undefined>;

const MAX_RPC_BODY_BYTES = 65_536;

const JSON_HEADERS = {
  'Content-Type': 'application/json',
  'Cache-Control': 'no-store',
};

const jsonResponse = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: JSON_HEADERS });

/** Reads the body up to the limit; `undefined` means the limit was exceeded. */
const readBoundedBody = async (request: Request) => {
  if (!request.body) {
    return '';
  }

  const reader = request.body.getReader();
  const decoder = new TextDecoder();
  const encoder = new TextEncoder();
  let body = '';
  let bytes = 0;

  // eslint-disable-next-line no-constant-condition
  while (true) {
    // eslint-disable-next-line no-await-in-loop
    const { done, value } = await reader.read();

    if (done) {
      return body + decoder.decode();
    }

    // Node streams adapted with `Readable.toWeb` may yield strings.
    const chunk: Uint8Array =
      typeof value === 'string' ? encoder.encode(value) : value;

    bytes += chunk.byteLength;

    if (bytes > MAX_RPC_BODY_BYTES) {
      break;
    }

    body += decoder.decode(chunk, { stream: true });
  }

  await reader.cancel();

  return undefined;
};

const relay = async (upstreamUrl: string, init: RequestInit) => {
  try {
    const upstream = await fetch(upstreamUrl, {
      ...init,
      signal: AbortSignal.timeout(20_000),
    });

    return new Response(await upstream.text(), {
      status: upstream.status,
      headers: JSON_HEADERS,
    });
  } catch {
    return jsonResponse(502, {
      error: 'The Solana demo upstream request failed',
    });
  }
};

/**
 * GET /api/jupiter/swap/v2/build — attaches the server-side Jupiter key.
 * Fixed upstream; no caller-provided destination URLs or browser API keys.
 */
export const handleJupiterBuild = async (
  request: Request,
  env: ProxyEnv,
): Promise<Response> => {
  if (request.method !== 'GET') {
    return jsonResponse(405, { error: 'Method not allowed' });
  }

  if (!env.JUPITER_API_KEY) {
    return jsonResponse(503, {
      error:
        'Set JUPITER_API_KEY in apps/intents-connect-demo/.env.local (or the Vercel project environment) and restart the demo, or configure VITE_JUPITER_BUILD_URL',
    });
  }

  const { search } = new URL(request.url);

  return relay(`https://api.jup.ag/swap/v2/build${search}`, {
    method: 'GET',
    headers: { 'x-api-key': env.JUPITER_API_KEY },
  });
};

/** POST /api/solana-rpc — permits account reads only. */
export const handleSolanaRpc = async (
  request: Request,
  env: ProxyEnv,
): Promise<Response> => {
  if (request.method !== 'POST') {
    return jsonResponse(405, { error: 'Method not allowed' });
  }

  const body = await readBoundedBody(request);

  if (body === undefined) {
    return jsonResponse(413, { error: 'RPC request too large' });
  }

  let method: string | undefined;

  try {
    method = (JSON.parse(body) as { method?: string }).method;
  } catch {
    return jsonResponse(400, { error: 'Invalid JSON-RPC request' });
  }

  if (method !== 'getMultipleAccounts') {
    return jsonResponse(400, {
      error: 'This proxy supports balance and mint reads only',
    });
  }

  return relay(env.SOLANA_RPC_URL ?? 'https://solana-rpc.publicnode.com', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body,
  });
};

type ProxyHandler = (request: Request, env: ProxyEnv) => Promise<Response>;

/** Same paths as the Vercel functions in `api/`. */
const ROUTES: Record<string, ProxyHandler> = {
  '/api/jupiter/swap/v2/build': handleJupiterBuild,
  '/api/solana-rpc': handleSolanaRpc,
};

/**
 * Vite dev/preview middleware. Production deployments use the Vercel functions
 * in `api/`, which call the same handlers.
 */
export const solanaProxy = (env: ProxyEnv): Plugin => {
  const middleware = async (
    req: IncomingMessage,
    res: ServerResponse,
    next: () => void,
  ) => {
    const url = new URL(req.url ?? '/', 'http://localhost');
    const handler = ROUTES[url.pathname];

    if (!handler) {
      next();

      return;
    }

    const method = req.method ?? 'GET';
    const hasBody = method !== 'GET' && method !== 'HEAD';
    // Incoming headers are intentionally dropped: nothing from the browser
    // (including any API key it sends) is forwarded upstream.
    const request = new Request(url, {
      method,
      body: hasBody ? Readable.toWeb(req) : undefined,
      duplex: 'half',
    } as RequestInit);

    const response = await handler(request, env);

    response.headers.forEach((value, key) => res.setHeader(key, value));
    res.statusCode = response.status;
    res.end(await response.text());
  };

  return {
    name: 'solana-demo-proxy',
    configureServer: (server) => {
      server.middlewares.use(middleware);
    },
    configurePreviewServer: (server) => {
      server.middlewares.use(middleware);
    },
  };
};
