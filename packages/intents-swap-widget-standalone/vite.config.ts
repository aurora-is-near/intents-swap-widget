import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { dirname } from 'node:path';

import dts from 'vite-plugin-dts';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import { nodePolyfills } from 'vite-plugin-node-polyfills';

import pkg from './package.json' with { type: 'json' };

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const externals = [
  ...Object.keys(pkg.dependencies ?? {}),
  ...Object.keys(pkg.peerDependencies ?? {}),
];

function isExt(id: string) {
  return externals.some((d) => id === d || id.startsWith(d + '/'));
}

export default defineConfig({
  plugins: [
    react(),
    dts({
      include: ['src'],
      entryRoot: 'src',
      outDir: 'dist',
      tsconfigPath: 'tsconfig.build.json',
    }),
    nodePolyfills({
      include: ['crypto', 'buffer', 'process', 'util'],
      globals: {
        Buffer: true,
        global: true,
        process: true,
      },
    }),
  ],
  build: {
    lib: {
      entry: resolve(__dirname, 'src/index.ts'),
      formats: ['es'],
    },
    copyPublicDir: false,
    rollupOptions: {
      external: (id) => isExt(id),
      output: {
        entryFileNames: '[name].js',
      },
    },
    sourcemap: true,
    target: 'esnext',
    emptyOutDir: true,
  },
});
