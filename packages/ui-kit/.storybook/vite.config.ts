import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

/**
 * Storybook's Vite config: React only. Tailwind and the aliases are added in
 * `main.ts` (`viteFinal`). The kit's own vite.config.ts is the library build.
 */
export default defineConfig({
  plugins: [react()],
});
