/**
 * Defaults shared by the vaults.fyi proxy (`server/vaultsFyiProxy.ts`) and,
 * later, the positions reader, so both agree without either importing the
 * other. No imports: the Edge Function bundles this file.
 */

/** The vaults.fyi API used when `VAULTS_FYI_API_URL` is not set. */
export const DEFAULT_VAULTS_FYI_API_URL = 'https://api.vaults.fyi';

/**
 * Where the vaults.fyi proxy is mounted: the Vite dev middleware and the
 * Vercel Edge Function `api/vaults-fyi.ts` (via the `vercel.json` rewrite).
 */
export const VAULTS_FYI_PROXY_PATH = '/api/vaults-fyi';
