import { createIntentsConnectApi } from '@aurora-is-near/intents-connect';

import {
  DEFAULT_INTENTS_CONNECT_API_URL,
  INTENTS_CONNECT_PROXY_PATH,
} from './intentsConnectUrls';

/** A trimmed env value, or `undefined` when unset or empty. */
const readEnv = (value: string | undefined) => {
  const trimmed = value?.trim();

  return trimmed === '' ? undefined : trimmed;
};

/**
 * The Reown (WalletConnect Cloud) project id, from `VITE_REOWN_PROJECT_ID`.
 *
 * Unset (or empty), this is `undefined` and `AppKitProvider` falls back to the
 * wallet package's shared Aurora id (`connect/projectId.ts`), as decided. The
 * package exports that id only from `connect/walletconnect`, which needs the
 * `@walletconnect/universal-provider` peer Borrow does not install, so the
 * fallback is left to the provider rather than imported here. Production
 * should set Borrow's own project, whose allowed domains list the site.
 */
export const REOWN_PROJECT_ID: string | undefined = readEnv(
  import.meta.env.VITE_REOWN_PROJECT_ID,
);

/** The Intents Connect API every call without a key goes to. */
export const INTENTS_CONNECT_API_URL =
  readEnv(import.meta.env.VITE_INTENTS_CONNECT_API_URL) ??
  DEFAULT_INTENTS_CONNECT_API_URL;

/**
 * Where the SDK sends its create calls: our own proxy, which adds the
 * server-side `x-api-key`. Resolved against the page's origin because the SDK
 * joins paths with `new URL`, which rejects a relative base.
 */
export const INTENTS_CONNECT_API_KEY_PROXY_URL = new URL(
  readEnv(import.meta.env.VITE_INTENTS_CONNECT_API_KEY_PROXY_URL) ??
    INTENTS_CONNECT_PROXY_PATH,
  window.location.origin,
).toString();

/**
 * The app's one Intents Connect client. It carries no API key: the key lives
 * only on the server (`INTENTS_CONNECT_API_KEY`), and create calls reach it
 * through `apiKeyProxyUrl`.
 */
export const intentsConnectApi = createIntentsConnectApi({
  baseUrl: INTENTS_CONNECT_API_URL,
  apiKeyProxyUrl: INTENTS_CONNECT_API_KEY_PROXY_URL,
});
