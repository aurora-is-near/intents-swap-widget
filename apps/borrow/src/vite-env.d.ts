/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Reown project id; the wallet package's shared id when unset. */
  readonly VITE_REOWN_PROJECT_ID?: string;
  /** Intents Connect API; the alpha API when unset. */
  readonly VITE_INTENTS_CONNECT_API_URL?: string;
  /** The API-key proxy for create calls; `/api/intents-connect` when unset. */
  readonly VITE_INTENTS_CONNECT_API_KEY_PROXY_URL?: string;
  /** Base JSON-RPC for Aave market reads; publicnode when unset. */
  readonly VITE_RPC_URL_BASE?: string;
  /** Arbitrum One JSON-RPC for Aave market reads; publicnode when unset. */
  readonly VITE_RPC_URL_ARB?: string;
  /** The intents API key (public) for the SDK's balance hooks. */
  readonly VITE_INTENTS_API_KEY?: string;
  /**
   * Development only: an EVM address whose positions My positions reads
   * instead of the wallet's. Ignored unless `import.meta.env.DEV`.
   */
  readonly VITE_DEBUG_POSITIONS_OWNER?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
