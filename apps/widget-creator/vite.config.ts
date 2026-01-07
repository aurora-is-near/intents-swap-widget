import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import svgr from 'vite-plugin-svgr';
import { Plugin } from 'vite';
import { nodePolyfills } from 'vite-plugin-node-polyfills';
import vercel from 'vite-plugin-vercel';
import path from 'path';

export default defineConfig({
  plugins: [react(), svgr({}), nodePolyfills(), vercel()] as Plugin[],
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
  },
  build: {
    outDir: 'dist',
  },

  // Due to @near-js versions mismatch across hot wallet and intents sdk
  // we need to alias the transactions module to the one in the intents sdk
  //
  // ../../node_modules/@near-js/accounts/lib/esm/account.js "GlobalContractDeployMode"
  // is not exported by"../../node_modules/@near-js/accounts/node_modules/@near-js/transactions/lib/esm/index.js"
  // imported by "../../node_modules/@near-js/accounts/lib/esm/account.js".
  resolve: {
    alias: {
      '@near-js/transactions': path.resolve(
        __dirname,
        '../../node_modules/@near-js/transactions',
      ),
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
      '@near-js/transactions': path.resolve(
        __dirname,
        '../../node_modules/@near-js/transactions',
      ),
    },
  },
});
