import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import svgr from 'vite-plugin-svgr';
import { Plugin } from 'vite';
import { nodePolyfills } from 'vite-plugin-node-polyfills';
import path from 'path';

export default defineConfig({
  plugins: [
    {
      name: 'full-reload-on-package-dist',
      handleHotUpdate({ file, server }) {
        if (file.includes('packages/intents-swap-widget/dist/index.js')) {
          server.ws.send({ type: 'full-reload' });
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
      ignored: [
        // ignore everything in the package dist EXCEPT the main entry file
        (path: string) => {
          if (
            path.includes('node_modules/@aurora-is-near/intents-swap-widget')
          ) {
            return !path.endsWith('dist/index.js');
          }
          return false;
        },
      ],
      awaitWriteFinish: {
        stabilityThreshold: 500,
        pollInterval: 100,
      },
    },
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
