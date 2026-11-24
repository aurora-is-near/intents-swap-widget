import { createIntentsConnectApi } from '@aurora-is-near/intents-connect';

import { readEnv } from './env';
import {
  DEFAULT_INTENTS_CONNECT_API_URL,
  INTENTS_CONNECT_PROXY_PATH,
} from './intentsConnectUrls';

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
 * Default read RPCs for the Aave markets: the publicnode endpoints the wallet
 * package also uses (`DEFAULT_RPC_OVERRIDES` in
 * `packages/intents-connect-wallet/src/connect/appkit/appkit.tsx`). Public
 * endpoints may rate-limit; production sets its own.
 */
export const DEFAULT_RPC_URL_BASE = 'https://base-rpc.publicnode.com';
export const DEFAULT_RPC_URL_ARB = 'https://arbitrum-one-rpc.publicnode.com';

/** Base (8453) JSON-RPC URL, from `VITE_RPC_URL_BASE`. */
export const RPC_URL_BASE =
  readEnv(import.meta.env.VITE_RPC_URL_BASE) ?? DEFAULT_RPC_URL_BASE;

/** Arbitrum One (42161) JSON-RPC URL, from `VITE_RPC_URL_ARB`. */
export const RPC_URL_ARB =
  readEnv(import.meta.env.VITE_RPC_URL_ARB) ?? DEFAULT_RPC_URL_ARB;

/**
 * The borrow fee the form shows, in basis points (30 = 0.30%), taken from
 * the borrowed amount as the artboard draws it (Web-Borrow.dc.html line
 * 1139). An estimate: the fee is an Intents Connect API-key fee, and Borrow
 * execution reconciles it with the quote (decided in the plan review).
 */
export const BORROW_FEE_BPS = 30;

/**
 * The app's one Intents Connect client. It carries no API key: the key lives
 * only on the server (`INTENTS_CONNECT_API_KEY`), and create calls reach it
 * through `apiKeyProxyUrl`.
 */
export const intentsConnectApi = createIntentsConnectApi({
  baseUrl: INTENTS_CONNECT_API_URL,
  apiKeyProxyUrl: INTENTS_CONNECT_API_KEY_PROXY_URL,
});
