import { fileURLToPath } from 'node:url';

import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig, loadEnv } from 'vite';

import { themeInitScript } from './vite-plugins/themeInitScript';
import { THEME_STORAGE_KEY } from './src/constants';

/** Names the API key had before it was `VITE_INTENTS_API_KEY`. */
const OLD_KEY_NAMES = [
  'INTENTS_CONNECT_API_KEY',
  'VITE_INTENTS_CONNECT_API_KEY',
] as const;

/**
 * The Intents Connect and intents API clients share one key,
 * `VITE_INTENTS_API_KEY`. A build that still sets only an old name would ship
 * with no Intents Connect key and fail every borrow at creation, so it stops
 * here with the rename instead.
 */
const assertApiKeyRenamed = (env: Record<string, string>) => {
  const old = OLD_KEY_NAMES.find((name) => env[name]?.trim());

  if (old && !env.VITE_INTENTS_API_KEY?.trim()) {
    throw new Error(
      `${old} is set but VITE_INTENTS_API_KEY is not: rename it to VITE_INTENTS_API_KEY (one key now serves both APIs).`,
    );
  }
};

export default defineConfig(({ mode }) => {
  // The '' prefix loads every variable, so the old name is visible here; the
  // bundle still sees only VITE_ ones.
  assertApiKeyRenamed({
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
