import { useMemo } from 'react';

import { WidgetConfigProvider } from '@aurora-is-near/intents-swap-widget';

import type { Account } from './accounts/types';
import { AccountsProvider, useAccounts } from './accounts/useAccounts';
import { buildWidgetConfig } from './accounts/widgetConfig';
import { NavigationProvider, useNavigation } from './navigation';
import { BrowserWalletsScreen } from './screens/connect/BrowserWalletsScreen';
import { ConnectBrowserWalletScreen } from './screens/connect/ConnectBrowserWalletScreen';
import { ConnectWalletScreen } from './screens/connect/ConnectWalletScreen';
import { WalletConnectScreen } from './screens/connect/WalletConnectScreen';
import { HomeScreen } from './screens/home/HomeScreen';
import { CreatePasskeyScreen } from './screens/onboarding/CreatePasskeyScreen';
import { PasskeyCreatedScreen } from './screens/onboarding/PasskeyCreatedScreen';
import { WelcomeScreen } from './screens/onboarding/WelcomeScreen';
import { SettingsScreen } from './screens/settings/SettingsScreen';

const Router = ({ account }: { account: Account | null }) => {
  const { screen } = useNavigation();

  switch (screen.name) {
    case 'welcome':
      return <WelcomeScreen />;
    case 'createPasskey':
      return <CreatePasskeyScreen />;
    case 'passkeyCreated':
      return <PasskeyCreatedScreen accountId={screen.accountId} />;
    case 'connectWallet':
      return <ConnectWalletScreen />;
    case 'browserWallets':
      return <BrowserWalletsScreen />;
    case 'connectBrowserWallet':
      return <ConnectBrowserWalletScreen wallet={screen.wallet} />;
    case 'walletConnect':
      return <WalletConnectScreen />;
    case 'settings':
      return <SettingsScreen />;
    case 'home':
      return account ? <HomeScreen account={account} /> : <WelcomeScreen />;
    default:
      return null;
  }
};

const Wallet = () => {
  const { active, isLoaded } = useAccounts();
  const config = useMemo(() => buildWidgetConfig(active), [active]);

  if (!isLoaded) {
    return null;
  }

  return (
    <WidgetConfigProvider
      config={config}
      balanceViaRpc={false}
      theme={{ colorScheme: 'dark' }}>
      <NavigationProvider initial={{ name: active ? 'home' : 'welcome' }}>
        <Router account={active} />
      </NavigationProvider>
    </WidgetConfigProvider>
  );
};

export const App = () => (
  <AccountsProvider>
    <Wallet />
  </AccountsProvider>
);
