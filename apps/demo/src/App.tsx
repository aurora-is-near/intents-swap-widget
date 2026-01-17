import { useState } from 'react';
import {
  guardStates,
  useUnsafeSnapshot,
  Widget,
  WidgetConfigProvider,
} from '@aurora-is-near/intents-swap-widget';
import type { Theme } from '@aurora-is-near/intents-swap-widget';

import { Toggle } from './components/Toggle';
import { PageHeader } from './components/PageHeader';
import { WidgetPageContainer } from './components/WidgetPageContainer';
import { useAppKitWallet } from './hooks/useAppKitWallet';

const defaultTheme: Theme = {
  primaryColor: '#D5B7FF',
  surfaceColor: '#24262D',
  colorScheme: 'dark',
};

type Props = {
  isLoading: boolean;
  showAppBalance: boolean;
  setShowAppBalance: (showAppBalance: boolean) => void;
};

const Content = ({ isLoading, showAppBalance, setShowAppBalance }: Props) => {
  const { ctx } = useUnsafeSnapshot();

  const isTransferSuccess = guardStates(ctx, ['transfer_success']);

  return (
    <Widget
      isFullPage={false}
      isLoading={isLoading}
      HeaderComponent={
        isTransferSuccess ? null : (
          <Toggle
            isOn={showAppBalance}
            label="Show app balance"
            onToggle={setShowAppBalance}
          />
        )
      }
    />
  );
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
            primaryColor: colors.primaryColor,
            surfaceColor: colors.surfaceColor,
          }))
        }
        onToggleTheme={(palette) =>
          setTheme((p) => ({
            colorScheme: palette,
            primaryColor: p.primaryColor,
            surfaceColor: p.surfaceColor,
          }))
        }
      />

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
          <Content
            isLoading={isLoading}
            showAppBalance={showAppBalance}
            setShowAppBalance={setShowAppBalance}
          />
        </WidgetConfigProvider>
      </WidgetPageContainer>
    </>
  );
};
