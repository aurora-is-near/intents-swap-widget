import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import type { Plugin } from 'vite';

import { getThemeInitScript } from './src/theme/themeInitScript';

const __dirname = dirname(fileURLToPath(import.meta.url));

/**
 * Inlines the theme init script at the top of index.html's <head>, the way an
 * app should, so a stored light/dark choice applies before the first paint.
 */
const themeInitScript = (): Plugin => ({
  name: 'ui-kit-theme-init-script',
  transformIndexHtml: () => [
    { tag: 'script', children: getThemeInitScript(), injectTo: 'head-prepend' },
  ],
});

/**
 * The dev-only playground (`yarn workspace @aurora-is-near/ui-kit dev`).
 * Separate from vite.config.ts, the library build, which never sees it.
 */
export default defineConfig({
  root: resolve(__dirname, 'playground'),
  plugins: [themeInitScript(), react(), tailwindcss()],
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
    },
  },
});
