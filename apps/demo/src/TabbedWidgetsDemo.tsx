import { useEffect, useState } from 'react';
import { DownloadIcon, RepeatIcon, SendIcon } from 'lucide-react';
import {
  WidgetConfigProvider,
  WidgetDeposit,
  WidgetSwap,
  WidgetWithdraw,
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

const WIDGET_TABS = [
  { id: 'swap', label: 'Swap', icon: RepeatIcon },
  { id: 'deposit', label: 'Deposit', icon: DownloadIcon },
  { id: 'withdraw', label: 'Withdraw', icon: SendIcon },
] as const;

const WIDGET_TYPES = {
  swap: WidgetSwap,
  deposit: WidgetDeposit,
  withdraw: WidgetWithdraw,
} as const;

export const TabbedWidgetsDemo = () => {
  const {
    providers,
    address: walletAddress,
    isConnecting: isLoading,
  } = useAppKitWallet();

  const [showAppBalance, setShowAppBalance] = useState(true);
  const appBalanceMode = walletAddress ? 'with-balance' : 'all';

  const [theme, setTheme] = useState<Theme>(defaultTheme);
  const [selectedWidget, setSelectedWidget] = useState<WidgetType>('swap');

  const sourceIntents = (() => {
    if (selectedWidget === 'deposit') {
      return 'none';
    }

    if (selectedWidget === 'withdraw') {
      return 'with-balance';
    }

    return showAppBalance ? appBalanceMode : 'none';
  })();

  const WidgetComponent = WIDGET_TYPES[selectedWidget];

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
        }>
        <PageHeader.Nav
          activeTab={selectedWidget}
          tabs={showAppBalance ? WIDGET_TABS : [WIDGET_TABS[0]]}
          onClick={(tab) => setSelectedWidget(tab)}
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
            chainsFilter: {
              target: {
                intents: showAppBalance ? 'all' : 'none',
                external: 'all',
              },
              source: {
                intents: sourceIntents,
                external: walletAddress ? 'wallet-supported' : 'all',
              },
            },
          }}>
          <WidgetComponent
            isFullPage={false}
            isLoading={isLoading}
            providers={providers}
            HeaderComponent={
              <Toggle
                isOn={showAppBalance}
                label="Show app balance"
                onToggle={setShowAppBalance}
              />
            }
          />
        </WidgetConfigProvider>
      </WidgetPageContainer>
    </>
  );
};
