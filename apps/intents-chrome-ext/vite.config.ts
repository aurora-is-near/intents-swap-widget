import { crx } from '@crxjs/vite-plugin';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import { nodePolyfills } from 'vite-plugin-node-polyfills';

import manifest from './manifest.config';

export default defineConfig({
  server: { port: 5180, strictPort: true, cors: { origin: /chrome-extension:\/\// } },
  plugins: [
    react(),
    tailwindcss(),
    // The widget package touches Buffer/process (near-api-js et al.).
    nodePolyfills({
      include: ['crypto', 'buffer', 'process', 'util'],
      globals: { Buffer: true, global: true, process: true },
    }),
    crx({
      manifest,
      contentScripts: {
        // Both run as classic scripts, so every import must be inlined.
        standaloneFiles: ['src/content/pageBridge.ts', 'src/content/relay.ts'],
      },
    }),
  ],
});
