import { defineConfig } from 'vitest/config';

/**
 * Unit tests (theme math, derivation), and component tests for the
 * accessibility primitives. Apart from vite.config.ts, whose library build
 * and plugins tests don't need. Node by default; a DOM test opts into jsdom
 * with a `// @vitest-environment jsdom` first line.
 */
export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.{ts,tsx}'],
    setupFiles: ['src/tests/setup.ts'],
  },
});
