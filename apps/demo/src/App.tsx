import { useEffect, useState } from 'react';
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

type WidgetType = 'swap' | 'deposit' | 'withdraw';

const defaultTheme: Theme = {
  primaryColor: '#D5B7FF',
  surfaceColor: '#24262D',
  colorScheme: 'dark',
};

type Props = {
  isLoading: boolean;
  showAppBalance: boolean;
  selectedWidget: WidgetType;
  setShowAppBalance: (showAppBalance: boolean) => void;
};

const Content = ({ isLoading, showAppBalance, setShowAppBalance }: Props) => {
  const { ctx } = useUnsafeSnapshot();
  const { providers } = useAppKitWallet();

  const isTransferSuccess = guardStates(ctx, ['transfer_success']);

  return (
    <Widget
      isFullPage={false}
      isLoading={isLoading}
      providers={providers}
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

const getSourceTokens = (
  selectedWidget: WidgetType,
  showAppBalance: boolean,
  walletAddress: string | undefined,
) => {
  return {
    intents: (() => {
      if (!showAppBalance) {
        return 'none' as const;
      }

      if (selectedWidget === 'deposit') {
        return 'none' as const;
      }

      if (selectedWidget === 'withdraw') {
        return 'with-balance' as const;
      }

      return walletAddress ? ('with-balance' as const) : ('all' as const);
    })(),

    external: (() => {
      if (selectedWidget === 'withdraw') {
        return 'none' as const;
      }

      if (selectedWidget === 'deposit') {
        return 'wallet-supported' as const;
      }

      return walletAddress ? ('wallet-supported' as const) : ('all' as const);
    })(),
  };
};

const getTargetTokens = (
  selectedWidget: WidgetType,
  showAppBalance: boolean,
) => {
  return {
    intents: (() => {
      if (!showAppBalance) {
        return 'none' as const;
      }

      if (selectedWidget === 'withdraw') {
        return 'none' as const;
      }

      if (selectedWidget === 'deposit') {
        return 'all' as const;
      }

      return 'with-balance' as const;
    })(),

    external: (() => {
      if (selectedWidget === 'withdraw') {
        return 'all' as const;
      }

      if (selectedWidget === 'deposit') {
        return 'none' as const;
      }

      return 'all' as const;
    })(),
  };
};

export const App = () => {
  const { address: walletAddress, isConnecting: isLoading } = useAppKitWallet();

  const [showAppBalance, setShowAppBalance] = useState(true);

  const [theme, setTheme] = useState<Theme>(defaultTheme);
  const [selectedWidget, setSelectedWidget] = useState<WidgetType>('swap');

  const targetTokens = getTargetTokens(selectedWidget, showAppBalance);
  const sourceTokens = getSourceTokens(
    selectedWidget,
    showAppBalance,
    walletAddress,
  );

  useEffect(() => {
    if (!showAppBalance) {
      setSelectedWidget('swap');
    }
  }, [showAppBalance]);

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
            chainsFilter: {
              target: targetTokens,
              source: sourceTokens,
            },
          }}>
          <Content
            isLoading={isLoading}
            showAppBalance={showAppBalance}
            setShowAppBalance={setShowAppBalance}
            selectedWidget={selectedWidget}
          />
        </WidgetConfigProvider>
      </WidgetPageContainer>
    </>
  );
};
