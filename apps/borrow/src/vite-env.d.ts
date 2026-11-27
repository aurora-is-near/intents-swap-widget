/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Reown project id; the wallet package's shared id when unset. */
  readonly VITE_REOWN_PROJECT_ID?: string;
  /** Intents Connect API; the alpha API when unset. */
  readonly VITE_INTENTS_CONNECT_API_URL?: string;
  /** Hosted actions API (borrow steps); the demo deployment when unset. */
  readonly VITE_INTENTS_CONNECT_ACTIONS_API_URL?: string;
  /** Base JSON-RPC for Aave market reads; publicnode when unset. */
  readonly VITE_RPC_URL_BASE?: string;
  /** Arbitrum One JSON-RPC for Aave market reads; publicnode when unset. */
  readonly VITE_RPC_URL_ARB?: string;
  /** The API key (public): Intents Connect create calls and balances. */
  readonly VITE_INTENTS_API_KEY?: string;
  /** Dev only: an address whose positions My positions shows instead. */
  readonly VITE_DEBUG_POSITIONS_OWNER?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
