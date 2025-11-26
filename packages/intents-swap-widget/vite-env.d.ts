/// <reference types="vite/client" />
/// <reference types="vite-plugin-svgr/client" />

interface ImportMetaEnv {
  readonly SWAP_WIDGET_VERSION: string;
}
interface ImportMeta {
  readonly env: ImportMetaEnv;
}
