import type { IncomingMessage, ServerResponse } from 'node:http';
import { Readable } from 'node:stream';
import type { Plugin } from 'vite';

import {
  handleIntentsConnectProxy,
  intentsConnectProxyOptions,
  type ProxyEnv,
} from '../server/intentsConnectProxy';
import { INTENTS_CONNECT_PROXY_PATH } from '../src/intentsConnectUrls';

/** Node request → web `Request`, with none of the browser's headers. */
const toWebRequest = (req: IncomingMessage, url: URL) => {
  const method = req.method ?? 'GET';
  const hasBody = method !== 'GET' && method !== 'HEAD';

  return new Request(url, {
    method,
    body: hasBody ? (Readable.toWeb(req) as ReadableStream) : undefined,
    duplex: 'half',
  } as RequestInit);
};

/**
 * Serves the Intents Connect API-key proxy at `/api/intents-connect` in
 * `vite dev` and `vite preview`, as the Edge Function in
 * `api/intents-connect.ts` does on Vercel; both call the same
 * handler. Pass a server-side env (`loadEnv(mode, dir, '')`) holding
 * `INTENTS_CONNECT_API_KEY`: it never reaches the bundle, which only sees
 * `VITE_` variables.
 */
export const intentsConnectProxy = (env: ProxyEnv): Plugin => {
  const options = intentsConnectProxyOptions(env);

  const middleware = (
    req: IncomingMessage,
    res: ServerResponse,
    next: (error?: unknown) => void,
  ) => {
    const url = new URL(req.url ?? '/', 'http://localhost');

    if (
      url.pathname !== INTENTS_CONNECT_PROXY_PATH &&
      !url.pathname.startsWith(`${INTENTS_CONNECT_PROXY_PATH}/`)
    ) {
      next();

      return;
    }

    handleIntentsConnectProxy(toWebRequest(req, url), options)
      .then(async (response) => {
        response.headers.forEach((value, key) => res.setHeader(key, value));
        res.statusCode = response.status;
        res.end(await response.text());
      })
      .catch(next);
  };

  return {
    name: 'borrow-intents-connect-proxy',
    configureServer: (server) => {
      server.middlewares.use(middleware);
    },
    configurePreviewServer: (server) => {
      server.middlewares.use(middleware);
    },
  };
};
