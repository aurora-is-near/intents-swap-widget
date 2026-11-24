import { createIntentsApi } from '@aurora-is-near/intents-connect';

import { readEnv } from './env';

/**
 * The Aurora intents API client (`intents-api.aurora.dev`): the token list
 * and the reads behind the SDK's account hooks, such as `useWalletBalances`.
 * `IntentsConnectProvider` needs it for those hooks.
 *
 * Its key, from `VITE_INTENTS_API_KEY`, is public: it travels in the URL
 * path, identifies the integration and is rate-limited, as for the swap
 * widget (`createIntentsApi`). It is not the Intents Connect API key, which
 * stays on the server behind the proxy.
 */
export const intentsApi = createIntentsApi({
  apiKey: readEnv(import.meta.env.VITE_INTENTS_API_KEY) ?? '',
});
