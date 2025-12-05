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

