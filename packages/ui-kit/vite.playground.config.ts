import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

const __dirname = dirname(fileURLToPath(import.meta.url));

/**
 * The dev-only playground (`yarn workspace @aurora-is-near/ui-kit dev`).
 * Separate from vite.config.ts, the library build, which never sees it.
 */
export default defineConfig({
  root: resolve(__dirname, 'playground'),
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
    },
  },
});
