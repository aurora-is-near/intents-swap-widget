import { useState } from 'react';
import {
  Widget,
  WidgetConfigProvider,
} from '@aurora-is-near/intents-swap-widget';
import type { Theme } from '@aurora-is-near/intents-swap-widget';

import { Toggle } from './components/Toggle';
import { PageHeader } from './components/PageHeader';
import { WidgetPageContainer } from './components/WidgetPageContainer';
import { useAppKitWallet } from './hooks/useAppKitWallet';

const defaultTheme: Theme = {
  accentColor: '#D5B7FF',
  backgroundColor: '#24262D',
  colorScheme: 'dark',
};

export const App = () => {
  const {
    address: walletAddress,
    isConnecting: isLoading,
    providers,
  } = useAppKitWallet();

  const [showAppBalance, setShowAppBalance] = useState(true);
  const [theme, setTheme] = useState<Theme>(defaultTheme);

  return (
    <>
      <PageHeader
        onSetColors={(colors) =>
          setTheme((p) => ({
            colorScheme: p.colorScheme,
            accentColor: colors.accentColor,
            backgroundColor: colors.backgroundColor,
          }))
        }
        onToggleTheme={(palette) =>
          setTheme((p) => ({
            colorScheme: palette,
            accentColor: p.accentColor,
            backgroundColor: p.backgroundColor,
          }))
        }>
        <Toggle
          isOn={showAppBalance}
          label="Show app balance"
          onToggle={setShowAppBalance}
        />
      </PageHeader>

      <WidgetPageContainer>
        <WidgetConfigProvider
          theme={theme}
          config={{
            appName: 'Demo App',
            connectedWallets: { default: walletAddress },
            intentsAccountType: 'evm',
            hideTokenInputHeadings: true,
            enableAccountAbstraction: showAppBalance,
            providers,
            priorityAssets: [
              ['eth', 'USDC'],
              ['arb', 'USDC'],
              ['avax', 'USDC'],
              ['base', 'USDC'],
              ['bsc', 'USDC'],
              ['op', 'USDC'],
              ['pol', 'USDC'],
              ['gnosis', 'USDC'],
              ['arb', 'USDT'],
              ['avax', 'USDT'],
              ['bera', 'USDT'],
              ['bsc', 'USDT'],
              ['eth', 'USDT'],
              ['gnosis', 'USDT'],
              ['op', 'USDT'],
              ['pol', 'USDT'],
              ['btc', 'BTC'],
              ['near', 'BTC'],
              ['eth', 'ETH'],
              ['near', 'ETH'],
              ['arb', 'ETH'],
              ['base', 'ETH'],
              ['op', 'ETH'],
              ['zec', 'ZEC'],
              ['near', 'ZEC'],
              ['sol', 'ZEC'],
              ['xrp', 'XRP'],
              ['near', 'NEAR'],
              ['bsc', 'NEAR'],
              ['tron', 'TRX'],
              ['eth', 'DAI'],
            ],
          }}>
          <Widget isFullPage={false} isLoading={isLoading} />
        </WidgetConfigProvider>
      </WidgetPageContainer>
    </>
  );
};
