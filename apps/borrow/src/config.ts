import {
  createIntentsApi,
  createIntentsConnectActionsApi,
  createIntentsConnectApi,
} from '@aurora-is-near/intents-connect';

import { readEnv } from '@/env';

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

/** The Intents Connect API used when no URL is configured. */
const DEFAULT_INTENTS_CONNECT_API_URL =
  'https://intents-connect-alpha-api.aurora.dev';

/** The Intents Connect API, from `VITE_INTENTS_CONNECT_API_URL`. */
const INTENTS_CONNECT_API_URL =
  readEnv(import.meta.env.VITE_INTENTS_CONNECT_API_URL) ??
  DEFAULT_INTENTS_CONNECT_API_URL;

/**
 * The hosted actions API used when no URL is configured: the demo deployment
 * that serves `aave-v3-borrow`.
 */
const DEFAULT_INTENTS_CONNECT_ACTIONS_API_URL =
  'https://intents-connect-actions-demo.aurora.dev';

/**
 * The hosted actions API, from `VITE_INTENTS_CONNECT_ACTIONS_API_URL`: the
 * catalog and the resolve of the borrow action (`BORROW_ACTION`). Public, no
 * key. Executions are still created on `VITE_INTENTS_CONNECT_API_URL`.
 */
const INTENTS_CONNECT_ACTIONS_API_URL =
  readEnv(import.meta.env.VITE_INTENTS_CONNECT_ACTIONS_API_URL) ??
  DEFAULT_INTENTS_CONNECT_ACTIONS_API_URL;

/**
 * The API key, from `VITE_INTENTS_API_KEY`: one key for both clients below.
 * Public: it ships in the bundle. The Intents Connect client sends it as
 * `x-api-key` on its two create calls, and its fee configuration is the
 * borrow fee; the intents API client puts it in the URL path, as for the
 * swap widget.
 */
const INTENTS_API_KEY = readEnv(import.meta.env.VITE_INTENTS_API_KEY);

if (!INTENTS_API_KEY) {
  // A configuration error, reported once at start-up; the app still runs,
  // without balances or borrows.
  console.error(
    '[Borrow] VITE_INTENTS_API_KEY is not set: wallet balances cannot be read and every borrow will fail at creation. Add it to apps/borrow/.env.local (or the deployment environment) and rebuild.',
  );
}

/**
 * Default read RPCs for the Aave markets: the publicnode endpoints the wallet
 * package also uses (`DEFAULT_RPC_OVERRIDES` in
 * `packages/intents-connect-wallet/src/connect/appkit/appkit.tsx`). Public
 * endpoints may rate-limit; production sets its own.
 */
const DEFAULT_RPC_URL_BASE = 'https://base-rpc.publicnode.com';
const DEFAULT_RPC_URL_ARB = 'https://arbitrum-one-rpc.publicnode.com';

/**
 * The markets' chains, by id, with the RPC Borrow reads each through: Base
 * (8453) from `VITE_RPC_URL_BASE`, Arbitrum One (42161) from
 * `VITE_RPC_URL_ARB`.
 */
export const RPC_URLS: Readonly<Record<number, string>> = {
  8453: readEnv(import.meta.env.VITE_RPC_URL_BASE) ?? DEFAULT_RPC_URL_BASE,
  42161: readEnv(import.meta.env.VITE_RPC_URL_ARB) ?? DEFAULT_RPC_URL_ARB,
};

/**
 * The borrow fee the form shows, in basis points (30 = 0.30%), as the
 * artboard labels it (Web-Borrow.dc.html line 1139). An estimate, taken from
 * the collateral: the fee is an Intents Connect API-key fee, which the dry
 * run reports in the bridged collateral, so the form's fee row shows it in
 * the collateral and the confirm dialog shows the dry run's own figure
 * (decided in the Borrow execution plan review).
 */
export const BORROW_FEE_BPS = 30;

/** The app's one Intents Connect client. */
export const intentsConnectApi = createIntentsConnectApi({
  baseUrl: INTENTS_CONNECT_API_URL,
  apiKey: INTENTS_API_KEY,
});

/** The hosted actions client: Borrow's steps come from `aave-v3-borrow`. */
export const intentsConnectActionsApi = createIntentsConnectActionsApi({
  baseUrl: INTENTS_CONNECT_ACTIONS_API_URL,
});

/**
 * The Aurora intents API client (`intents-api.aurora.dev`): the token list
 * and the reads behind the SDK's account hooks, such as `useWalletBalances`.
 * `IntentsConnectProvider` needs it for those hooks. Without a key it is
 * still built, so the hooks report a failed read rather than throwing.
 */
export const intentsApi = createIntentsApi({ apiKey: INTENTS_API_KEY ?? '' });
