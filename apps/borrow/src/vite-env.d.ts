/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Reown project id; the wallet package's shared id when unset. */
  readonly VITE_REOWN_PROJECT_ID?: string;
  /** Intents Connect API; the alpha API when unset. */
  readonly VITE_INTENTS_CONNECT_API_URL?: string;
  /** Base JSON-RPC for Aave market reads; publicnode when unset. */
  readonly VITE_RPC_URL_BASE?: string;
  /** Arbitrum One JSON-RPC for Aave market reads; publicnode when unset. */
  readonly VITE_RPC_URL_ARB?: string;
  /** The API key (public): Intents Connect create calls and balances. */
  readonly VITE_INTENTS_API_KEY?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
