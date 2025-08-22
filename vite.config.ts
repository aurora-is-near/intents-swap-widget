import glob from "glob";
import execa from "execa";
import { fileURLToPath } from "node:url";
import { dirname, resolve, relative, extname } from "node:path";

import { defineConfig } from "vite";
import dts from "vite-plugin-dts";
import svgr from "vite-plugin-svgr";
import react from "@vitejs/plugin-react";

import pkg from "./package.json" assert { type: "json" };

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const externals = [
  ...Object.keys(pkg.dependencies ?? {}),
  ...Object.keys(pkg.peerDependencies ?? {}),
];

function isExt(id: string) {
  return externals.some((d) => id === d || id.startsWith(d + "/"));
}

async function runPostBuild() {
  await execa('node', ['scripts/copy-styles.js'], { stdio: 'inherit' });
  await execa('node', ['scripts/generate-tw-utils.js'], { stdio: 'inherit' });
}

export default defineConfig({
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
    react(),
    dts({
      include: ["src"],
      entryRoot: "src",
      outDir: "dist",
      tsconfigPath: "tsconfig.build.json",
      copyDtsFiles: false,
      rollupTypes: false,
      insertTypesEntry: true,
    }),
    {
      name: 'postbuild-runner',
      closeBundle: async () => {
        // runs after each build (including incremental rebuilds in --watch)
        await runPostBuild();
      },
    },
  ],
  css: {
    postcss: "./postcss.config.cjs",
  },
  resolve: {
    alias: {
      "@": resolve(__dirname, "src"),
    },
  },
  optimizeDeps: {
    exclude: [],
  },
  build: {
    lib: {
      entry: resolve(__dirname, "src/index.ts"),
      formats: ["es"],
    },
    copyPublicDir: false,
    rollupOptions: {
      external: isExt,
      output: {
        // inlineDynamicImports: true,
        entryFileNames: "[name].js",
        assetFileNames: 'assets/[name][extname]',
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
});
