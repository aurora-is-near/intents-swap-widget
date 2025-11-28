import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import svgr from 'vite-plugin-svgr';
import { Plugin } from 'vite';
import { nodePolyfills } from 'vite-plugin-node-polyfills';
import vercel from 'vite-plugin-vercel';

export default defineConfig({
  plugins: [react(), svgr(), nodePolyfills(), vercel()] as Plugin[],
});
