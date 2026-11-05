import pkg from './package.json';

const ICONS = {
  16: 'icons/icon-16.png',
  32: 'icons/icon-32.png',
  48: 'icons/icon-48.png',
  128: 'icons/icon-128.png',
};

/** Written to dist/manifest.json by vite.config.ts. */
export const manifest = {
  manifest_version: 3,
  name: 'Aurora Intents for Aave (dev)',
  description:
    'Internal test build: supply to Aave from any wallet and chain with Intents Connect.',
  version: pkg.version,
  icons: ICONS,
  // The toolbar button opens the modal on any site (src/background.ts):
  // `activeTab` lends it the tab on click, so no site access is asked for.
  action: {
    default_icon: ICONS,
    default_title: 'Supply with Aurora (a theme preview off app.aave.com)',
  },
  background: { service_worker: 'background.js' },
  permissions: ['activeTab', 'scripting'],
  content_scripts: [
    {
      // MAIN world: the only place the page's wallets (EIP-6963, Wallet
      // Standard, NEAR injected) are visible. No chrome.* APIs are needed.
      matches: ['https://app.aave.com/*'],
      js: ['content.js'],
      world: 'MAIN',
      run_at: 'document_idle',
    },
  ],
};
