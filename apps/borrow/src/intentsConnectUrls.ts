/**
 * Defaults shared by the client (`src/config.ts`) and the API-key proxy
 * (`server/intentsConnectProxy.ts`), so both agree without either importing
 * the other. No imports: the Edge Function bundles this file.
 */

/** The Intents Connect API used when no URL is configured. */
export const DEFAULT_INTENTS_CONNECT_API_URL =
  'https://intents-connect-alpha-api.aurora.dev';

/**
 * Where the API-key proxy is mounted: the Vite dev middleware and the Vercel
 * Edge Function `api/intents-connect.ts` (via the `vercel.json` rewrite).
 */
export const INTENTS_CONNECT_PROXY_PATH = '/api/intents-connect';
