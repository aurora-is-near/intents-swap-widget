/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Reown project id; the wallet package's shared id when unset. */
  readonly VITE_REOWN_PROJECT_ID?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
