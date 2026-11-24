import {
  handleIntentsConnectProxy,
  intentsConnectProxyOptions,
  restoreRewrittenPath,
} from '../server/intentsConnectProxy.js';

/**
 * Vercel Edge Function serving `/api/intents-connect/*` in production, with
 * the same handler as the dev middleware (`plugins/intentsConnectProxy.ts`).
 * `INTENTS_CONNECT_API_KEY` comes from the Vercel project's environment.
 *
 * One static function rather than `api/intents-connect/[...path].ts`:
 * catch-all files in `api/` are not reliably routed outside Next.js, so
 * `vercel.json` rewrites `/api/intents-connect/:path*` to
 * `/api/intents-connect?path=:path*` and `restoreRewrittenPath` puts the
 * original path back before the handler checks it.
 *
 * Signature per https://vercel.com/docs/functions/runtimes/edge (framework
 * "other"): `config.runtime = 'edge'` and a default-exported
 * `(request: Request) => Response`.
 */
export const config = { runtime: 'edge' };

export default function handler(request: Request): Promise<Response> {
  return handleIntentsConnectProxy(
    restoreRewrittenPath(request),
    intentsConnectProxyOptions(process.env),
  );
}
