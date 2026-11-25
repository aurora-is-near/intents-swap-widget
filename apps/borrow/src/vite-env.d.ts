/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Reown project id; the wallet package's shared id when unset. */
  readonly VITE_REOWN_PROJECT_ID?: string;
  /** Intents Connect API; the alpha API when unset. */
  readonly VITE_INTENTS_CONNECT_API_URL?: string;
  /** Intents Connect API key (client-side) for the SDK's create calls. */
  readonly VITE_INTENTS_CONNECT_API_KEY?: string;
  /** Base JSON-RPC for Aave market reads; publicnode when unset. */
  readonly VITE_RPC_URL_BASE?: string;
  /** Arbitrum One JSON-RPC for Aave market reads; publicnode when unset. */
  readonly VITE_RPC_URL_ARB?: string;
  /** The intents API key (public) for the SDK's balance hooks. */
  readonly VITE_INTENTS_API_KEY?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
