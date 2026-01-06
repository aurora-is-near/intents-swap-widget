import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import svgr from 'vite-plugin-svgr';
import { Plugin } from 'vite';
import { nodePolyfills } from 'vite-plugin-node-polyfills';
import vercel from 'vite-plugin-vercel';

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
    sourcemap: true,
  },
});
