import { useMemo } from 'react';

import {
  useStoreSideEffects,
  WidgetConfigProvider,
} from '@aurora-is-near/intents-swap-widget';

import type { Account } from './accounts/types';
import { AccountsProvider, useAccounts } from './accounts/useAccounts';
import { buildWidgetConfig } from './accounts/widgetConfig';
import { ALCHEMY_API_KEY } from './config';
import { NavigationProvider, useNavigation } from './navigation';
import { BrowserWalletsScreen } from './screens/connect/BrowserWalletsScreen';
import { ConnectBrowserWalletScreen } from './screens/connect/ConnectBrowserWalletScreen';
import { ConnectWalletScreen } from './screens/connect/ConnectWalletScreen';
import { WalletConnectScreen } from './screens/connect/WalletConnectScreen';
import { DepositAddressesScreen } from './screens/deposit/DepositAddressesScreen';
import { DepositDetailScreen } from './screens/deposit/DepositDetailScreen';
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
    case 'deposit':
      return account ? <DepositAddressesScreen account={account} /> : null;
    case 'depositDetail':
      return account ? (
        <DepositDetailScreen account={account} networkId={screen.network} />
      ) : null;
    case 'home':
      return account ? <HomeScreen account={account} /> : <WelcomeScreen />;
    default:
      return null;
  }
};

/**
 * Keeps the widget's state machine in step with the active account for every
 * screen: config, the connected address and the wallet's balances.
 */
const WidgetSync = () => {
  useStoreSideEffects({
    listenTo: [
      'syncConfig',
      'checkWalletConnection',
      ['setBalancesUsingAlchemyExt', { alchemyApiKey: ALCHEMY_API_KEY }],
    ],
  });

  return null;
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
      // Alchemy covers EVM and Solana wallets; NEAR balances come over RPC.
      balanceViaRpc={active?.kind === 'wallet' && active.family === 'near'}
      theme={{ colorScheme: 'dark' }}>
      <WidgetSync />
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
