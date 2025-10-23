declare module '*.svg' {
  const src: string;
  export default src;
}

declare module '*.svg?url' {
  const content: string;
  export default content;
}

// Vite environment variables
/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_REOWN_PROJECT_ID: string;
  readonly VITE_APP_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
