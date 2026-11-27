import { useTheme } from '@aurora-is-near/ui-kit';
import {
  AppKitContext,
  AppKitProvider,
} from '@aurora-is-near/intents-connect-wallet/connect/appkit';
import { useContext, useEffect } from 'react';
import type { ReactNode } from 'react';

import { REOWN_PROJECT_ID } from '@/config';

import { WalletSessionProvider } from './WalletSessionProvider';

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
 * The wallet connection: Reown AppKit (EVM and Solana), inside `ThemeProvider`
 * so its modal follows the kit's resolved light or dark theme, and the
 * session that adds NEAR and Stellar behind the wallet package's connect
 * modal (`WalletSessionProvider`).
 */
export function WalletProvider({ children }: WalletProviderProps) {
  const { theme } = useTheme();

  return (
    <AppKitProvider
      appName="Aurora Borrow"
      projectId={REOWN_PROJECT_ID}
      themeMode={theme}>
      <AppKitThemeSync />
      <WalletSessionProvider>{children}</WalletSessionProvider>
    </AppKitProvider>
  );
}
