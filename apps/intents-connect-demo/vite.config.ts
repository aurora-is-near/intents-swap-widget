import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig, loadEnv } from 'vite';
import { fileURLToPath } from 'node:url';
import { nodePolyfills } from 'vite-plugin-node-polyfills';
import { solanaProxy } from './solanaProxy';

export default defineConfig(({ mode }) => ({
  // Pinned so `yarn dev` is always where you expect. `strictPort` makes a
  // port collision (e.g. a leftover Next server) a loud error instead of a
  // silent bump to 3001 — serving a DIFFERENT app on 3000 fooled us once.
  server: { port: 3000, strictPort: false },
  plugins: [
    solanaProxy({
      ...process.env,
      ...loadEnv(mode, fileURLToPath(new URL('.', import.meta.url)), ''),
    }),
    react(),
    tailwindcss(),
    // The widget package touches Buffer/process (near-api-js et al.).
    nodePolyfills({
      include: ['crypto', 'buffer', 'process', 'util'],
      globals: { Buffer: true, global: true, process: true },
    }),
  ],
}));
