import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import { nodePolyfills } from 'vite-plugin-node-polyfills';

export default defineConfig({
  // Pinned so `yarn dev` is always where you expect. `strictPort` makes a
  // port collision (e.g. a leftover Next server) a loud error instead of a
  // silent bump to 3001 — serving a DIFFERENT app on 3000 fooled us once.
  server: { port: 3000, strictPort: true },
  plugins: [
    react(),
    tailwindcss(),
    // The widget package touches Buffer/process (near-api-js et al.).
    nodePolyfills({
      include: ['crypto', 'buffer', 'process', 'util'],
      globals: { Buffer: true, global: true, process: true },
    }),
  ],
});
