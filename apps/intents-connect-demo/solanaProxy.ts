import type { IncomingMessage, ServerResponse } from 'node:http';
import type { Plugin } from 'vite';

/** Fixed upstreams; no caller-provided destination URLs or browser API keys. */
export const solanaProxy = (
  env: Record<string, string | undefined>,
): Plugin => {
  const middleware = async (
    req: IncomingMessage,
    res: ServerResponse,
    next: () => void,
  ) => {
    const url = new URL(req.url ?? '/', 'http://localhost');
    const isJupiter = url.pathname === '/api/jupiter/swap/v2/build';
    const isRpc = url.pathname === '/api/solana-rpc';

    if (!isJupiter && !isRpc) {
      next();

      return;
    }

    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Cache-Control', 'no-store');

    if (req.method !== (isJupiter ? 'GET' : 'POST')) {
      res.statusCode = 405;
      res.end(JSON.stringify({ error: 'Method not allowed' }));

      return;
    }

    if (isJupiter && !env.JUPITER_API_KEY) {
      res.statusCode = 503;
      res.end(
        JSON.stringify({
          error:
            'Set JUPITER_API_KEY in apps/intents-connect-demo/.env.local and restart the demo, or configure VITE_JUPITER_BUILD_URL',
        }),
      );

      return;
    }

    try {
      let body: string | undefined;

      if (isRpc) {
        body = '';

        // Node 20 supports async iteration natively; bound the body as it arrives.
        // eslint-disable-next-line no-restricted-syntax
        for await (const chunk of req) {
          body += String(chunk);

          if (body.length > 65_536) {
            res.statusCode = 413;
            res.end(JSON.stringify({ error: 'RPC request too large' }));

            return;
          }
        }

        const request = JSON.parse(body) as { method?: string };

        if (request.method !== 'getMultipleAccounts') {
          res.statusCode = 400;
          res.end(
            JSON.stringify({
              error: 'This proxy supports balance and mint reads only',
            }),
          );

          return;
        }
      }

      const upstream = await fetch(
        isJupiter
          ? `https://api.jup.ag/swap/v2/build${url.search}`
          : (env.SOLANA_RPC_URL ?? 'https://solana-rpc.publicnode.com'),
        {
          method: isJupiter ? 'GET' : 'POST',
          headers: isJupiter
            ? { 'x-api-key': env.JUPITER_API_KEY! }
            : { 'Content-Type': 'application/json' },
          body,
          signal: AbortSignal.timeout(20_000),
        },
      );

      res.statusCode = upstream.status;
      res.end(await upstream.text());
    } catch {
      res.statusCode = 502;
      res.end(
        JSON.stringify({ error: 'The Solana demo upstream request failed' }),
      );
    }
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
