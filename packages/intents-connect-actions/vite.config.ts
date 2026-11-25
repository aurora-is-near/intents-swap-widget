import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

import dts from 'vite-plugin-dts';
import { defineConfig } from 'vite';

import pkg from './package.json' with { type: 'json' };

const __dirname = dirname(fileURLToPath(import.meta.url));

const externals = Object.keys(pkg.peerDependencies);

/**
 * An ES library of plain TypeScript, one file per entry: `index` (the
 * resolver and its tables, no SDK) and `sdk` (the recipe, which needs
 * `@aurora-is-near/intents-connect`, kept external as a peer).
 */
export default defineConfig({
  plugins: [
    dts({
      include: ['src'],
      exclude: ['**/*.test.ts', 'src/tests'],
      entryRoot: 'src',
      outDir: 'dist',
      tsconfigPath: 'tsconfig.build.json',
    }),
  ],
  build: {
    lib: {
      entry: {
        index: resolve(__dirname, 'src/index.ts'),
        sdk: resolve(__dirname, 'src/sdk.ts'),
      },
      formats: ['es'],
    },
    copyPublicDir: false,
    rollupOptions: {
      external: (id) =>
        externals.some((dep) => id === dep || id.startsWith(`${dep}/`)),
      output: {
        entryFileNames: '[name].js',
        chunkFileNames: 'chunks/[name]-[hash].js',
      },
    },
    sourcemap: true,
    target: 'esnext',
    emptyOutDir: true,
  },
});
