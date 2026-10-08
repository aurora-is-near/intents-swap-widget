import { useMemo } from 'react';

import { WidgetConfigProvider } from '@aurora-is-near/intents-swap-widget';
import type { WidgetConfig } from '@aurora-is-near/intents-swap-widget';

import type { Account } from './accounts/types';
import { AccountsProvider, useAccounts } from './accounts/useAccounts';
import { API_KEY } from './config';
import { NavigationProvider, useNavigation } from './navigation';
import { createWebAuthnProvider } from './passkey/webauthn';
import { HomeScreen } from './screens/home/HomeScreen';
import { CreatePasskeyScreen } from './screens/onboarding/CreatePasskeyScreen';
import { PasskeyCreatedScreen } from './screens/onboarding/PasskeyCreatedScreen';
import { WelcomeScreen } from './screens/onboarding/WelcomeScreen';

/**
 * A passkey account only holds intents balances: no wallet chains, so no
 * on-chain balance loading, and refunds and swaps stay on NEAR Intents.
 */
const buildWidgetConfig = (account: Account | null): Partial<WidgetConfig> => {
  if (!account) {
    return { apiKey: API_KEY, connectedWallets: {} };
  }

  return {
    apiKey: API_KEY,
    enableAccountAbstraction: true,
    intentsAccountType: 'webauthn',
    connectedWallets: { default: account.intentsAccountId },
    providers: { webauthn: createWebAuthnProvider(account) },
  };
};

const Router = ({ account }: { account: Account | null }) => {
  const { screen } = useNavigation();

  switch (screen.name) {
    case 'welcome':
      return <WelcomeScreen />;
    case 'createPasskey':
      return <CreatePasskeyScreen />;
    case 'passkeyCreated':
      return <PasskeyCreatedScreen accountId={screen.accountId} />;
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
