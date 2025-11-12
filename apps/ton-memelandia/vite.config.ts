import { defineConfig } from 'vite';
import svgr from 'vite-plugin-svgr';
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import vercel from 'vite-plugin-vercel';
import { sentryVitePlugin } from "@sentry/vite-plugin";

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
    process.env.SENTRY_AUTH_TOKEN ? sentryVitePlugin({
      authToken: process.env.SENTRY_AUTH_TOKEN,
      org: "aurora-k2",
      project: "ton-memelandia",
    }) : null,
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
    sourcemap: true,
  },
});
