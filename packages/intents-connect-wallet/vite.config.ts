import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { dirname } from 'node:path';

import dts from 'vite-plugin-dts';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

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

// One entry per subpath. Separate entries are what keep each chain's SDK out of
// the others' module graph — a single barrel would make `./evm` pull Stellar.
const entries = [
  'index',
  'evm',
  'solana',
  'stellar',
  'near',
  'connect',
  'connect/appkit',
  'connect/near',
  'connect/stellar',
];

export default defineConfig({
  plugins: [
    react(),
    dts({
      include: ['src'],
      exclude: ['**/*.test.ts', '**/*.test.tsx'],
      entryRoot: 'src',
      outDir: 'dist',
      tsconfigPath: 'tsconfig.build.json',
    }),
  ],
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
    },
  },
  build: {
    lib: {
      entry: Object.fromEntries(
        entries.map((name) => [
          name === 'index' ? 'index' : `${name}/index`,
          resolve(
            __dirname,
            name === 'index' ? 'src/index.ts' : `src/${name}/index.ts`,
          ),
        ]),
      ),
      formats: ['es'],
    },
    copyPublicDir: false,
    rollupOptions: {
      external: (id) => isExt(id),
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
