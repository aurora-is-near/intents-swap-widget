import { useTheme } from '@aurora-is-near/ui-kit';
import {
  AppKitContext,
  AppKitProvider,
} from '@aurora-is-near/intents-connect-wallet/connect/appkit';
import { type ReactNode, useContext, useEffect } from 'react';

import { REOWN_PROJECT_ID } from '../config';

/**
 * `AppKitProvider` creates AppKit once per mount and ignores later
 * `themeMode` props, so a theme switch after load is pushed to the live
 * instance here instead.
 */
function AppKitThemeSync() {
  const { theme } = useTheme();
  const appKit = useContext(AppKitContext)?.appKit;

  useEffect(() => {
    appKit?.setThemeMode(theme);
  }, [appKit, theme]);

  return null;
}

type WalletProviderProps = {
  children: ReactNode;
};

/**
 * Reown AppKit (EVM and Solana connection), inside `ThemeProvider` so the
 * connect modal follows the kit's resolved light or dark theme.
 */
export function WalletProvider({ children }: WalletProviderProps) {
  const { theme } = useTheme();

  return (
    <AppKitProvider
      appName="Aurora Borrow"
      projectId={REOWN_PROJECT_ID}
      themeMode={theme}>
      <AppKitThemeSync />
      {children}
    </AppKitProvider>
  );
}
