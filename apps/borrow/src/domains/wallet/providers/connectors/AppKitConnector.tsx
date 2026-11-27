import { useTheme } from '@aurora-is-near/ui-kit';
import {
  AppKitContext,
  AppKitProvider,
  useAppKitConnector,
  useIntentsConnectWallet,
} from '@aurora-is-near/intents-connect-wallet/connect/appkit';
import { useContext, useEffect } from 'react';

import { REOWN_PROJECT_ID } from '@/config';

import { useReport } from './useReport';
import type { ConnectorProps } from './types';

/**
 * The kit's font in AppKit's modal. Setting it also stops AppKit preloading
 * its own fonts from fonts.reown.com at start-up.
 */
const APPKIT_THEME_VARIABLES = {
  '--w3m-font-family': "'Schibsted Grotesk', system-ui, sans-serif",
};

/**
 * Reports AppKit's connector once AppKit exists: its `connect` throws before.
 * `AppKitProvider` creates AppKit once per mount and ignores later
 * `themeMode` props, so a theme switch is pushed to the live instance here.
 */
function AppKitReport({ onChange }: ConnectorProps) {
  const appKit = useContext(AppKitContext)?.appKit ?? null;
  const { theme } = useTheme();
  const connector = useAppKitConnector();
  const intents = useIntentsConnectWallet();

  useEffect(() => {
    appKit?.setThemeMode(theme);
  }, [appKit, theme]);

  const key = [
    appKit !== null,
    connector.isConnected,
    connector.address,
    connector.signingStandard,
    connector.getChainId !== undefined,
    intents.family,
    intents.wallet !== null,
  ].join('|');

  useReport(
    () =>
      appKit
        ? { connector, wallet: intents.wallet, family: intents.family }
        : null,
    key,
    onChange,
  );

  return null;
}

/**
 * Reown AppKit (EVM and Solana), in the kit's resolved light or dark theme.
 * Its own chunk: AppKit with its EVM and Solana SDKs is most of the wallet
 * code. It loads right after the first render, since AppKit restores a saved
 * session on start.
 */
export function Connector({ onChange }: ConnectorProps) {
  const { theme } = useTheme();

  return (
    <AppKitProvider
      appName="Aurora Borrow"
      projectId={REOWN_PROJECT_ID}
      themeMode={theme}
      themeVariables={APPKIT_THEME_VARIABLES}>
      <AppKitReport onChange={onChange} />
    </AppKitProvider>
  );
}
