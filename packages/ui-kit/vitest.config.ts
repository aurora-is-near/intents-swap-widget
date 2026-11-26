import { defineConfig } from 'vitest/config';

/**
 * Unit tests (cn, tokens) and component tests for the kit. Separate from
 * vite.config.ts, whose library build and plugins tests don't need. jsdom by
 * default; the tests that read the CSS files from disk opt into node with a
 * `// @vitest-environment node` first line.
 */
export default defineConfig({
  test: {
    environment: 'jsdom',
    include: ['src/**/*.test.{ts,tsx}'],
    setupFiles: ['src/tests/setup.ts'],
  },
});
