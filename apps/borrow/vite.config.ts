import { fileURLToPath } from 'node:url';

import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig, loadEnv } from 'vite';

import { themeInitScript } from './vite-plugins/themeInitScript';
import { THEME_STORAGE_KEY } from './src/theme';

/**
 * The Intents Connect key used to be the server-only
 * `INTENTS_CONNECT_API_KEY`, read by a proxy that no longer exists. A build
 * that still has only that name would ship with no key and fail every borrow
 * at creation, so it stops here with the rename instead.
 */
const assertIntentsConnectKeyRenamed = (env: Record<string, string>) => {
  if (
    env.INTENTS_CONNECT_API_KEY?.trim() &&
    !env.VITE_INTENTS_CONNECT_API_KEY?.trim()
  ) {
    throw new Error(
      'INTENTS_CONNECT_API_KEY is set but VITE_INTENTS_CONNECT_API_KEY is not: rename it to VITE_INTENTS_CONNECT_API_KEY (the proxy that read the old name is gone).',
    );
  }
};

export default defineConfig(({ mode }) => {
  // The '' prefix loads every variable, so the old name is visible here; the
  // bundle still sees only VITE_ ones.
  assertIntentsConnectKeyRenamed({
    ...loadEnv(mode, fileURLToPath(new URL('.', import.meta.url)), ''),
    ...(process.env as Record<string, string>),
  });

  return {
    plugins: [themeInitScript(THEME_STORAGE_KEY), react(), tailwindcss()],
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url)),
      },
    },
  };
});
