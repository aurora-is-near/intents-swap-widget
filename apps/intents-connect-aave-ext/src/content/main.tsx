/**
 * app.aave.com, MAIN world: the "Supply with Aurora" button and its modal.
 * MAIN, not the isolated world, because the page's wallets (EIP-6963,
 * Wallet Standard, NEAR injected) are only visible here.
 */
import { createRoot } from 'react-dom/client';

import { AAVE_THEME, mountSupplyButton } from '../page/aave';
import { createShadowHost } from '../ui/mount';
import { installThemeInspector, THEME_INSPECTOR } from '../ui/theme';
import { App, modal } from './App';

createRoot(createShadowHost('aurora-intents-aave')).render(<App />);
mountSupplyButton(modal.open, AAVE_THEME);

// Dev builds: `?aurora-theme=inspect`, or `auroraIntents.theme.inspect()`.
if (THEME_INSPECTOR) {
  installThemeInspector({ open: modal.open });
}
