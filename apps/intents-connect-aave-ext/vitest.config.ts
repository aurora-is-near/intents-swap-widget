import { defineConfig } from 'vitest/config';

/**
 * Unit tests for the pure parts (theme math, derivation). Apart from
 * vite.config.ts, whose library build and plugins tests don't need.
 */
export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
});
