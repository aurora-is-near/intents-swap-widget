import type { IncomingMessage, ServerResponse } from 'node:http';

import type { Plugin } from 'vite';

import {
  handleVaultsFyiProxy,
  type ProxyEnv,
  vaultsFyiProxyOptions,
} from '../server/vaultsFyiProxy';
import { VAULTS_FYI_PROXY_PATH } from '../src/vaultsFyiUrls';

/**
 * Serves the vaults.fyi proxy at `/api/vaults-fyi` in `vite dev` and
 * `vite preview`, as the Edge Function in `api/vaults-fyi.ts` does on
 * Vercel; both call the same handler. Pass a server-side env
 * (`loadEnv(mode, dir, '')`) holding `VAULTS_FYI_API_KEY`: it never reaches
 * the bundle, which only sees `VITE_` variables.
 */
export const vaultsFyiProxy = (env: ProxyEnv): Plugin => {
  const options = vaultsFyiProxyOptions(env);

  const middleware = (
    req: IncomingMessage,
    res: ServerResponse,
    next: (error?: unknown) => void,
  ) => {
    const url = new URL(req.url ?? '/', 'http://localhost');

    if (
      url.pathname !== VAULTS_FYI_PROXY_PATH &&
      !url.pathname.startsWith(`${VAULTS_FYI_PROXY_PATH}/`)
    ) {
      next();

      return;
    }

    // No body and none of the browser's headers: the proxy only serves GET.
    handleVaultsFyiProxy(
      new Request(url, { method: req.method ?? 'GET' }),
      options,
    )
      .then(async (response) => {
        response.headers.forEach((value, key) => res.setHeader(key, value));
        res.statusCode = response.status;
        res.end(await response.text());
      })
      .catch(next);
  };

  return {
    name: 'borrow-vaults-fyi-proxy',
    configureServer: (server) => {
      server.middlewares.use(middleware);
    },
    configurePreviewServer: (server) => {
      server.middlewares.use(middleware);
    },
  };
};
