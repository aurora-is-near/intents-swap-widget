import { createIntentsApi } from '@aurora-is-near/intents-connect';

import { readEnv } from './env';

/**
 * The intents API key, from `VITE_INTENTS_API_KEY`. Required: the SDK's
 * balance hooks read the token list and balances with it, and without it
 * every connected user sees "Balances did not load".
 *
 * Public: it travels in the URL path, identifies the integration and is
 * rate-limited, as for the swap widget (`createIntentsApi`). It is not the
 * Intents Connect API key (`VITE_INTENTS_CONNECT_API_KEY` in `config.ts`).
 */
export const INTENTS_API_KEY = readEnv(import.meta.env.VITE_INTENTS_API_KEY);

/** What is reported when the key is missing, so the cause is plain. */
export const MISSING_INTENTS_API_KEY_MESSAGE =
  '[Borrow] VITE_INTENTS_API_KEY is not set: wallet balances cannot be read. Add it to apps/borrow/.env.local (or the deployment environment) and rebuild.';

if (!INTENTS_API_KEY) {
  // A configuration error, reported once at start-up, as the Aave extension
  // does for the same variable; the app still runs, without balances.
  console.error(MISSING_INTENTS_API_KEY_MESSAGE);
}

/**
 * The Aurora intents API client (`intents-api.aurora.dev`): the token list
 * and the reads behind the SDK's account hooks, such as `useWalletBalances`.
 * `IntentsConnectProvider` needs it for those hooks. Without a key it is
 * still built, so the hooks report a failed read rather than throwing.
 */
export const intentsApi = createIntentsApi({ apiKey: INTENTS_API_KEY ?? '' });
