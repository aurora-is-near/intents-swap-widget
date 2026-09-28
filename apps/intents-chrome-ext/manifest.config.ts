import { defineManifest } from '@crxjs/vite-plugin';

import pkg from './package.json';

const ICONS = {
  16: 'icons/icon-16.png',
  32: 'icons/icon-32.png',
  48: 'icons/icon-48.png',
  128: 'icons/icon-128.png',
};

export default defineManifest({
  manifest_version: 3,
  name: 'Intents Connect',
  description: 'Deposit to supported dApps from any chain with NEAR Intents.',
  version: pkg.version,
  icons: ICONS,
  action: { default_icon: ICONS, default_title: 'Intents Connect' },
  side_panel: { default_path: 'sidepanel.html' },
  background: { service_worker: 'src/background/index.ts', type: 'module' },
  // `tabs` exposes the active tab's URL to the panel, which is how it knows
  // whether the user is on an integration's site.
  permissions: ['sidePanel', 'tabs'],
  host_permissions: [
    'https://polymarket.com/*',
    // Profile lookup (EOA → Polymarket account); host access sidesteps CORS.
    'https://gamma-api.polymarket.com/*',
  ],
  content_scripts: [
    {
      // MAIN world: the only place the page's injected wallets are visible.
      matches: ['https://polymarket.com/*'],
      js: ['src/content/pageBridge.ts'],
      world: 'MAIN',
      run_at: 'document_start',
    },
    {
      matches: ['https://polymarket.com/*'],
      js: ['src/content/relay.ts'],
      run_at: 'document_start',
    },
  ],
});
