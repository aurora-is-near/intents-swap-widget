import { fileURLToPath } from 'node:url';

import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig, loadEnv } from 'vite';

import { intentsConnectProxy } from './plugins/intentsConnectProxy';
import { themeInitScript } from './plugins/themeInitScript';
import { vaultsFyiProxy } from './plugins/vaultsFyiProxy';
import { THEME_STORAGE_KEY } from './src/theme';

export default defineConfig(({ mode }) => {
  // The '' prefix loads every variable, INTENTS_CONNECT_API_KEY and
  // VAULTS_FYI_API_KEY included, for the dev server only; the bundle still
  // sees just VITE_ ones.
  const serverEnv = {
    ...process.env,
    ...loadEnv(mode, fileURLToPath(new URL('.', import.meta.url)), ''),
  };

  return {
    plugins: [
      themeInitScript(THEME_STORAGE_KEY),
      intentsConnectProxy(serverEnv),
      vaultsFyiProxy(serverEnv),
      react(),
      tailwindcss(),
    ],
  };
});
