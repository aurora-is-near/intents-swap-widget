import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import svgr from 'vite-plugin-svgr';
import { Plugin } from 'vite';
import { nodePolyfills } from 'vite-plugin-node-polyfills';
import path from 'path';
import { globSync } from 'glob';

const workspacePackages = globSync(
  path.resolve(__dirname, '../../packages/*'),
).map((pkgDir) => path.basename(pkgDir));

let reloadTimer: NodeJS.Timeout | undefined;

export default defineConfig({
  plugins: [
    {
      name: 'full-reload-on-package-dist',
      handleHotUpdate({ file, server }) {
        // Trigger a full reload whenever a file in the dist folder of any
        // workspace package changes. The function is debounced to avoid
        // multiple reloads in quick succession when multiple files change.
        if (workspacePackages.some((pkg) => file.includes(`${pkg}/dist/`))) {
          clearTimeout(reloadTimer);
          reloadTimer = setTimeout(
            () => server.ws.send({ type: 'full-reload' }),
            200,
          );
          return [];
        }
      },
    },
    react(),
    svgr({}),
    nodePolyfills({
      include: ['crypto', 'buffer', 'process', 'util'],
      globals: {
        Buffer: true,
        global: true,
        process: true,
      },
    }),
  ] as Plugin[],
  css: {
    postcss: './postcss.config.cjs',
    modules: false,
  },
  define: {
    global: 'globalThis',
  },
  server: {
    port: 5175,
    fs: {
      allow: ['..'],
    },
    host: true, // Allow access from network
    cors: true, // Enable CORS for TON Connect
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': '*',
    },
    watch: {
      awaitWriteFinish: {
        stabilityThreshold: 500,
        pollInterval: 100,
      },
    },
  },
  optimizeDeps: {
    exclude: workspacePackages,
  },
  build: {
    outDir: 'dist',
    target: 'esnext',
    reportCompressedSize: false,
    rollupOptions: {
      output: {
        manualChunks: {
          privy: ['@privy-io/react-auth'],
          prism: ['prism-react-renderer'],
          standalone: ['@aurora-is-near/intents-swap-widget-standalone'],
        },
      },
    },
  },

  // Due to @near-js versions mismatch across hot wallet and intents sdk
  // we need to alias the transactions module to the one in the intents sdk
  //
  // ../../node_modules/@near-js/accounts/lib/esm/account.js "GlobalContractDeployMode"
  // is not exported by"../../node_modules/@near-js/accounts/node_modules/@near-js/transactions/lib/esm/index.js"
  // imported by "../../node_modules/@near-js/accounts/lib/esm/account.js".
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@near-js/transactions': path.resolve(
        __dirname,
        '../../node_modules/@near-js/transactions',
      ),
    },
  },
});
