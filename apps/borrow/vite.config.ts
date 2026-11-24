import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

import { themeInitScript } from './plugins/themeInitScript';
import { THEME_STORAGE_KEY } from './src/theme';

export default defineConfig({
  plugins: [themeInitScript(THEME_STORAGE_KEY), react(), tailwindcss()],
});
