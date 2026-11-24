/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Reown project id; the wallet package's shared id when unset. */
  readonly VITE_REOWN_PROJECT_ID?: string;
  /** Intents Connect API; the alpha API when unset. */
  readonly VITE_INTENTS_CONNECT_API_URL?: string;
  /** The API-key proxy for create calls; `/api/intents-connect` when unset. */
  readonly VITE_INTENTS_CONNECT_API_KEY_PROXY_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
