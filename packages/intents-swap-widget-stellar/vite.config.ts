import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { dirname } from 'node:path';

import dts from 'vite-plugin-dts';
import { defineConfig } from 'vite';

import pkg from './package.json' with { type: 'json' };

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const externals = [
  ...Object.keys(pkg.dependencies ?? {}),
  ...Object.keys((pkg as { peerDependencies?: Record<string, string> }).peerDependencies ?? {}),
];

function isExt(id: string) {
  return externals.some((d) => id === d || id.startsWith(d + '/'));
}

export default defineConfig({
  plugins: [
    dts({
      include: ['src'],
      entryRoot: 'src',
      outDir: 'dist',
      tsconfigPath: 'tsconfig.build.json',
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
