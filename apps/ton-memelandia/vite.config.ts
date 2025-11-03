import { defineConfig } from 'vite';
import svgr from 'vite-plugin-svgr';
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { nodePolyfills } from 'vite-plugin-node-polyfills';
import vercel from 'vite-plugin-vercel';

export default defineConfig({
  plugins: [
    svgr({
      svgrOptions: {
        ref: true,
        icon: true,
        prettier: false,
        typescript: true,
      },
      include: "**/*.svg",
    }),
    tailwindcss(),
    react(),
    vercel(),
    nodePolyfills({
      include: ['crypto', 'buffer', 'process', 'util'],
      globals: {
        Buffer: true,
        global: true,
        process: true,
      },
    }),
  ].filter(Boolean),
  css: {
    postcss: "./postcss.config.cjs",
    modules: false,
  },
  define: {
    global: 'globalThis',
  },
  server: {
    port: 5174,
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
});
