import { fileURLToPath } from 'node:url';

import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig, loadEnv } from 'vite';
import { nodePolyfills } from 'vite-plugin-node-polyfills';

import { prerender } from './vite-plugins/prerender';
import { themeInitScript } from './vite-plugins/themeInitScript';
import { vaultsFyiProxy } from './vite-plugins/vaultsFyiProxy';
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
  // The '' prefix loads every variable, so the old name and the server-side
  // VAULTS_FYI_API_KEY are visible here; the bundle still sees only VITE_ ones.
  const env = {
    ...loadEnv(mode, fileURLToPath(new URL('.', import.meta.url)), ''),
    ...(process.env as Record<string, string>),
  };

  assertApiKeyRenamed(env);

  return {
    plugins: [
      themeInitScript(THEME_STORAGE_KEY),
      prerender(env.SITE_URL),
      vaultsFyiProxy(env),
      react(),
      tailwindcss(),
      // The swap widget touches Node's crypto, Buffer and process (its
      // NEAR, TON and Stellar dependencies).
      nodePolyfills({
        include: ['crypto', 'buffer', 'process', 'util'],
        globals: { Buffer: true, global: true, process: true },
      }),
    ],
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url)),
      },
    },
  };
});
