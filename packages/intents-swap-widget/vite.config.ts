import { glob } from 'glob';
import { fileURLToPath } from 'node:url';
import { dirname, resolve, relative, extname } from 'node:path';

import dts from 'vite-plugin-dts';
import svgr from 'vite-plugin-svgr';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

import { defineConfig } from 'vite';
import { viteStaticCopy } from 'vite-plugin-static-copy';
import { nodePolyfills } from 'vite-plugin-node-polyfills';

import pkg from './package.json' with { type: 'json' };

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const testFiles = ['**/*.test.tsx', '**/*.test.ts', 'src/tests/**'];

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
        prettier: false,
        typescript: true,
        exportType: 'default',
      },
      include: '**/*.svg',
      esbuildOptions: {
        loader: 'tsx',
      },
    }),
    tailwindcss(),
    react(),
    dts({
      include: ['src'],
      exclude: testFiles,
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
    viteStaticCopy({
      targets: [
        {
          src: 'src/tailwind.css',
          dest: '.',
        },
        {
          src: 'src/theme.css',
          dest: '.',
        },
      ],
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
  server: {
    watch: {
      ignored: testFiles,
    },
  },
  esbuild: {
    exclude: testFiles,
  },
  build: {
    lib: {
      entry: resolve(__dirname, 'src/index.ts'),
      formats: ['es'],
    },
    copyPublicDir: false,
    rollupOptions: {
      external: (id) => isExt(id) || id.includes('test.ts'),
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
        glob.sync('src/**/*.{ts,tsx}', { ignore: testFiles }).map((file) => [
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
