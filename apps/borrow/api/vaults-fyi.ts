import {
  handleVaultsFyiProxy,
  restoreRewrittenPath,
  vaultsFyiProxyOptions,
} from '../server/vaultsFyiProxy.js';

/**
 * Vercel Edge Function serving `/api/vaults-fyi/*` in production, with the
 * same handler as the dev middleware (`vite-plugins/vaultsFyiProxy.ts`).
 * `VAULTS_FYI_API_KEY` comes from the Vercel project's environment.
 *
 * One static function rather than `api/vaults-fyi/[...path].ts`: catch-all
 * files in `api/` are not reliably routed outside Next.js, so `vercel.json`
 * rewrites `/api/vaults-fyi/:path*` to `/api/vaults-fyi?path=:path*` and
 * `restoreRewrittenPath` puts the original path back before the handler
 * checks it.
 */
export const config = { runtime: 'edge' };

export default function handler(request: Request): Promise<Response> {
  return handleVaultsFyiProxy(
    restoreRewrittenPath(request),
    vaultsFyiProxyOptions(process.env),
  );
}
