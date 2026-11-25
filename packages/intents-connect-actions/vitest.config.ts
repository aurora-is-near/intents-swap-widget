import { defineConfig } from 'vitest/config';

/**
 * The resolver's unit tests and the action's fixtures (read from
 * `actions/*\/tests`). Node only: nothing here touches the DOM.
 */
export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
});
