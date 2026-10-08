import { defineManifest } from '@crxjs/vite-plugin';

import pkg from './package.json';

const ICONS = {
  16: 'icons/icon-16.png',
  32: 'icons/icon-32.png',
  48: 'icons/icon-48.png',
  128: 'icons/icon-128.png',
};

/**
 * Pins the extension ID (nppedgjalfgoidfihoahjfofjbhkefkm) for unpacked
 * builds. Passkeys are bound to that ID (their RP ID), so changing this key
 * orphans every passkey account created with it. Before publishing, replace it
 * with the public key from the Chrome Web Store dashboard.
 */
const KEY =
  'MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAnHWoDCMMVvodQ8T0e72kw8g3MHovn4Ia0w+12pgrp1dB704xFAGFhSAxO3xmWhvCtitSoR29ziSQ6JQcDcTiaY79hrj/doEbfVFCef++BTapqe+XRd/NCaEOWb9UK1/FVildOoy2uaqvuoedE2aqd7F7XQkZVwRhyNj/dsqtkDKxRIJDk0YQhA0+a9Di4rOCMB3mg310LVdYFX/8lfkZaDdyrxQ1yGfLPSF/VOxvaLnjceYEIIxLVoFFdBlsGUBlC6DSCDmA8yHe2P9X8/jcquoRAke81oP5fID5uYMDcNEcBBA/h+QaNFzfeETMk8U0b6IUnRCK1oWOaHQH5iQZOwIDAQAB';

/**
 * @param connectorUrl The extension's own wallet page (see connector/).
 *   Browser wallets only inject into web pages, so they are connected to that
 *   page's origin and every request for them is served there.
 */
export const createManifest = (connectorUrl: string) => {
  // Every web page, the connector included: the panel also reads (never
  // prompts) which wallet accounts the open site is connected with.
  if (!/^https?:/.test(connectorUrl)) {
    throw new Error(`VITE_CONNECTOR_URL must be http(s): ${connectorUrl}`);
  }

  const bridgedPages = ['https://*/*', 'http://*/*'];

  return defineManifest({
    manifest_version: 3,
    name: 'Aurora Intents',
    description: 'Swap, deposit and send across 35+ chains with NEAR Intents.',
    version: pkg.version,
    key: KEY,
    icons: ICONS,
    action: { default_icon: ICONS, default_title: 'Aurora Intents' },
    side_panel: { default_path: 'sidepanel.html' },
    background: { service_worker: 'src/background/index.ts', type: 'module' },
    // `storage` keeps the accounts (passkeys and connected wallets); `tabs`
    // finds the connector page's tab and the open site's URL and icon.
    permissions: ['sidePanel', 'storage', 'tabs'],
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
