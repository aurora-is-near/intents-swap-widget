import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { defineConfig } from 'vitest/config';

const __dirname = dirname(fileURLToPath(import.meta.url));

/**
 * Unit tests (cn, tokens) and component tests for the kit. Separate from
 * vite.config.ts, whose library build and plugins tests don't need. Node by
 * default; a DOM test opts into jsdom with a `// @vitest-environment jsdom`
 * first line.
 */
export default defineConfig({
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
    },
  },
  test: {
    environment: 'node',
    include: ['src/**/*.test.{ts,tsx}'],
    setupFiles: ['src/tests/setup.ts'],
  },
});
