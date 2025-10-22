import { glob } from "glob";
import { fileURLToPath } from "node:url";
import { dirname, resolve, relative, extname } from "node:path";

import { defineConfig } from "vite";
import dts from "vite-plugin-dts";
import svgr from "vite-plugin-svgr";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { nodePolyfills } from 'vite-plugin-node-polyfills';

import pkg from "./package.json" with { type: "json" };

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const externals = [
  ...Object.keys(pkg.dependencies ?? {}),
  ...Object.keys(pkg.peerDependencies ?? {}),
];

function isExt(id: string) {
  return externals.some((d) => id === d || id.startsWith(d + "/"));
}

export default defineConfig(({ command }) => {
  const isServe = command === 'serve';
  const isDemoBuild = process.env.BUILD_TARGET === 'demo';

  // Demo build mode - build demo pages as production SPA
  if (isDemoBuild) {
    return {
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
        nodePolyfills({
          include: ['crypto', 'buffer', 'process', 'util'],
          globals: {
            Buffer: true,
            global: true,
            process: true,
          },
        }),
      ],
      css: {
        postcss: "./postcss.config.cjs",
        modules: false,
      },
      resolve: {
        alias: {
          "@": resolve(__dirname, "src"),
        },
      },
      define: {
        global: 'globalThis',
      },
      build: {
        outDir: 'dist-demo',
        emptyOutDir: true,
        sourcemap: false,
        rollupOptions: {
          input: {
            main: resolve(__dirname, 'index.html'),
          },
        },
      },
    };
  }

  // Standard dev/library build
  return {
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
      isServe && nodePolyfills({
        include: ['crypto', 'buffer', 'process', 'util'],
        globals: {
          Buffer: true,
          global: true,
          process: true,
        },
      }),
      !isServe && dts({
        include: ["src"],
        entryRoot: "src",
        outDir: "dist",
        tsconfigPath: "tsconfig.build.json",
        copyDtsFiles: false,
        rollupTypes: false,
        insertTypesEntry: true,
      }),
    ].filter(Boolean),
    css: {
      postcss: "./postcss.config.cjs",
      modules: false,
    },
    resolve: {
      alias: {
        "@": resolve(__dirname, "src"),
      },
    },
    optimizeDeps: {
      exclude: [],
    },
    define: isServe ? {
      global: 'globalThis',
    } : undefined,
    server: isServe ? {
      fs: {
        allow: ['..']
      },
      host: true, // Allow access from network
      cors: true, // Enable CORS for TON Connect
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Allow-Headers': '*',
      },
    } : undefined,
    build: isServe ? undefined : {
      lib: {
        entry: resolve(__dirname, "src/index.ts"),
        formats: ["es"],
      },
      copyPublicDir: false,
      rollupOptions: {
        external: isExt,
        output: {
          entryFileNames: "[name].js",
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
          glob.sync("src/**/*.{ts,tsx}").map((file) => [
            // 1. The name of the entry point
            // lib/nested/foo.js becomes nested/foo
            relative("src", file.slice(0, file.length - extname(file).length)),
            // 2. The absolute path to the entry file
            // lib/nested/foo.ts becomes /project/lib/nested/foo.ts
            fileURLToPath(new URL(file, import.meta.url)),
          ])
        ),
      },
      sourcemap: true,
      target: "esnext",
      emptyOutDir: true,
    },
  };
});
