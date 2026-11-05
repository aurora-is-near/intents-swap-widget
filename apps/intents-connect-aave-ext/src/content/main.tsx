/**
 * MAIN world: the "Supply with Aurora" button and its modal. MAIN, not the
 * isolated world, because the page's wallets (EIP-6963, Wallet Standard,
 * NEAR injected) are only visible here.
 *
 * On app.aave.com the manifest runs it. Elsewhere the toolbar button
 * injects it (src/background.ts), flagged `preview`: a theme preview of the
 * modal on that site, which never supplies.
 */
import { createRoot } from 'react-dom/client';

import { AAVE_THEME, mountSupplyButton } from '../page/aave';
import { createShadowHost } from '../ui/mount';
import { installThemeInspector, THEME_INSPECTOR } from '../ui/theme';
import { App, modal } from './App';

type AuroraGlobal = Window & {
  auroraIntents?: { preview?: boolean; open?: () => void };
};

const page = window as AuroraGlobal;

// Once per page, however often it's injected.
if (typeof page.auroraIntents?.open !== 'function') {
  const preview = page.auroraIntents?.preview === true;

  createRoot(createShadowHost('aurora-intents-aave')).render(
    <App preview={preview} />,
  );

  if (!preview) {
    mountSupplyButton(modal.open, AAVE_THEME);
  }

  page.auroraIntents = { ...page.auroraIntents, open: modal.open };

  // In every build of this extension (vite.config.ts): the toolbar button,
  // `?aurora-theme=inspect`, or `auroraIntents.theme.inspect()`.
  if (THEME_INSPECTOR) {
    installThemeInspector({ open: modal.open });
  }
}
