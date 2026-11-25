import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

import dts from 'vite-plugin-dts';
import { defineConfig } from 'vite';

const __dirname = dirname(fileURLToPath(import.meta.url));

/** An ES library of plain TypeScript: no dependencies to keep external. */
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
      entry: resolve(__dirname, 'src/index.ts'),
      formats: ['es'],
      fileName: 'index',
    },
    copyPublicDir: false,
    sourcemap: true,
    target: 'esnext',
    emptyOutDir: true,
  },
});
