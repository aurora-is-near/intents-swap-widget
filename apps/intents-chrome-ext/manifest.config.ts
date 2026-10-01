import { defineManifest } from '@crxjs/vite-plugin';

import pkg from './package.json';

const ICONS = {
  16: 'icons/icon-16.png',
  32: 'icons/icon-32.png',
  48: 'icons/icon-48.png',
  128: 'icons/icon-128.png',
};

/**
 * @param connectorUrl The extension's own wallet page (see connector/). Wallets
 *   connected in the extension are connected to this origin, not to the site.
 */
export const createManifest = (connectorUrl: string) => {
  const bridgedPages = [
    'https://polymarket.com/*',
    `${new URL(connectorUrl).origin}/*`,
  ];

  return defineManifest({
    manifest_version: 3,
    name: 'Intents Connect',
    description: 'Deposit to supported dApps from any chain with NEAR Intents.',
    version: pkg.version,
    icons: ICONS,
    action: { default_icon: ICONS, default_title: 'Intents Connect' },
    side_panel: { default_path: 'sidepanel.html' },
    background: { service_worker: 'src/background/index.ts', type: 'module' },
    // `tabs` exposes the active tab's URL to the panel, which is how it knows
    // whether the user is on an integration's site. `storage` remembers the
    // wallets connected to the extension.
    permissions: ['sidePanel', 'tabs', 'storage'],
    host_permissions: [
      'https://polymarket.com/*',
      // Profile lookup (EOA → Polymarket account); host access sidesteps CORS.
      'https://gamma-api.polymarket.com/*',
    ],
    content_scripts: [
      {
        // MAIN world: the only place a page's injected wallets are visible.
        matches: bridgedPages,
        js: ['src/content/pageBridge.ts'],
        world: 'MAIN',
        run_at: 'document_start',
      },
      {
        matches: bridgedPages,
        js: ['src/content/relay.ts'],
        run_at: 'document_start',
      },
    ],
  });
};
