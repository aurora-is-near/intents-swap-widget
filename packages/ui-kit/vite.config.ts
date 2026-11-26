import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

import dts from 'vite-plugin-dts';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

import pkg from './package.json' with { type: 'json' };

const __dirname = dirname(fileURLToPath(import.meta.url));

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
      exclude: [
        '**/*.test.ts',
        '**/*.test.tsx',
        '**/*.stories.tsx',
        'src/tests',
        'src/stories',
      ],
      entryRoot: 'src',
      outDir: 'dist',
      tsconfigPath: 'tsconfig.build.json',
    }),
  ],
  build: {
    lib: {
      entry: resolve(__dirname, 'src/index.ts'),
      formats: ['es'],
      fileName: 'index',
    },
    copyPublicDir: false,
    rollupOptions: {
      external: (id) => isExt(id),
    },
    sourcemap: true,
    target: 'esnext',
    emptyOutDir: true,
  },
});
