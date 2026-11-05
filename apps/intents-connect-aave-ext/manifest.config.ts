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
