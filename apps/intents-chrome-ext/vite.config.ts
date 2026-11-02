import { crx } from '@crxjs/vite-plugin';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig, loadEnv } from 'vite';
import { nodePolyfills } from 'vite-plugin-node-polyfills';

import { createManifest } from './manifest.config';

// Local default; point VITE_CONNECTOR_URL at the deployed connector/ page.
const DEFAULT_CONNECTOR_URL = 'http://localhost:5190/';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), 'VITE_');
  const connectorUrl = env.VITE_CONNECTOR_URL ?? DEFAULT_CONNECTOR_URL;

  return {
    server: {
      port: 5180,
      strictPort: true,
      cors: { origin: /chrome-extension:\/\// },
    },
    define: { __CONNECTOR_URL__: JSON.stringify(connectorUrl) },
    plugins: [
      react(),
      tailwindcss(),
      // The widget package touches Buffer/process (near-api-js et al.).
      nodePolyfills({
        include: ['crypto', 'buffer', 'process', 'util'],
        globals: { Buffer: true, global: true, process: true },
      }),
      crx({
        manifest: createManifest(connectorUrl),
        contentScripts: {
          // Both run as classic scripts, so every import must be inlined.
          standaloneFiles: [
            'src/content/pageBridge.ts',
            'src/content/relay.ts',
          ],
        },
      }),
    ],
  };
});
