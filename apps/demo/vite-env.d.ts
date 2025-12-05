/// <reference types="vite/client" />
/// <reference types="vite-plugin-svgr/client" />

declare module '*.svg' {
  const src: string;
  export default src;
}

declare module '*.svg?url' {
  const content: string;
  export default content;
}

interface ImportMeta {
  env: {
    VITE_ALCHEMY_API_KEY: string;
  };
}
