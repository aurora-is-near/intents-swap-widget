import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig, type Plugin } from 'vite';

import { manifest } from './manifest.config';

const emitManifest = (): Plugin => ({
  name: 'emit-manifest',
  generateBundle() {
    this.emitFile({
      type: 'asset',
      fileName: 'manifest.json',
      source: JSON.stringify(manifest, null, 2),
    });
  },
});

/**
 * One classic script, every import inlined: a MAIN-world content script
 * can't load modules. A library build rather than @crxjs/vite-plugin, whose
 * standalone content-script build runs without this config's plugins
 * (Tailwind) — and there is nothing else for it to do here.
 */
export default defineConfig(({ mode }) => ({
  plugins: [react(), tailwindcss(), emitManifest()],
  // Library mode leaves it in, and the page has no `process`.
  define: { 'process.env.NODE_ENV': JSON.stringify(mode) },
  build: {
    emptyOutDir: true,
    lib: {
      entry: 'src/content/main.tsx',
      formats: ['iife'],
      name: 'auroraIntentsAave',
      fileName: () => 'content.js',
    },
  },
}));
