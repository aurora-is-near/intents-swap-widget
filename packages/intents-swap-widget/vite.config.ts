// @ts-expect-error no glob package types
import { glob } from 'glob';
import { fileURLToPath } from 'node:url';
import { dirname, resolve, relative, extname } from 'node:path';

import { defineConfig } from 'vite';
import dts from 'vite-plugin-dts';
import svgr from 'vite-plugin-svgr';
import { nodePolyfills } from 'vite-plugin-node-polyfills';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

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
  define: {
    'import.meta.env.SWAP_WIDGET_VERSION': JSON.stringify(pkg.version),
  },
  plugins: [
    svgr({
      svgrOptions: {
        ref: true,
        icon: true,
        prettier: false,
        typescript: true,
      },
      include: '**/*.svg',
    }),
    tailwindcss(),
    react(),
    dts({
      include: ['src'],
      entryRoot: 'src',
      outDir: 'dist',
      tsconfigPath: 'tsconfig.build.json',
      copyDtsFiles: false,
      rollupTypes: false,
      insertTypesEntry: true,
    }),
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
    postcss: './postcss.config.cjs',
    modules: false,
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
    },
  },
  optimizeDeps: {
    exclude: [],
  },
  build: {
    lib: {
      entry: resolve(__dirname, 'src/index.ts'),
      formats: ['es'],
    },
    copyPublicDir: false,
    rollupOptions: {
      external: isExt,
      output: {
        entryFileNames: '[name].js',
        assetFileNames: (assetInfo) => {
          if (assetInfo.name && assetInfo.name.endsWith('.css')) {
            return 'styles.css';
          }

          // default for other assets
          return 'assets/[name][extname]';
        },
      },
      input: Object.fromEntries(
        // https://rollupjs.org/configuration-options/#input
        // @ts-expect-error file has type any
        glob.sync('src/**/*.{ts,tsx}').map((file) => [
          // 1. The name of the entry point
          // lib/nested/foo.js becomes nested/foo
          relative('src', file.slice(0, file.length - extname(file).length)),
          // 2. The absolute path to the entry file
          // lib/nested/foo.ts becomes /project/lib/nested/foo.ts
          fileURLToPath(new URL(file, import.meta.url)),
        ]),
      ),
    },
    sourcemap: true,
    target: 'esnext',
    emptyOutDir: true,
  },
});
