import { useState } from 'react';
import { DownloadIcon, RepeatIcon, SendIcon } from 'lucide-react';
import {
  WidgetConfigProvider,
  WidgetDeposit,
  WidgetSwap,
  WidgetWithdraw,
} from '@aurora-is-near/intents-swap-widget';

import { Toggle } from './components/Toggle';
import { PageHeader } from './components/PageHeader';
import { useAppKitWallet } from './hooks/useAppKitWallet';

type WidgetType = 'swap' | 'deposit' | 'withdraw';

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

  const [selectedWidget, setSelectedWidget] = useState<WidgetType>('swap');

  const WidgetComponent = WIDGET_TYPES[selectedWidget];

  return (
    <>
      <PageHeader>
        <PageHeader.Nav
          tabs={WIDGET_TABS}
          activeTab={selectedWidget}
          onClick={(tab) => setSelectedWidget(tab)}
        />
      </PageHeader>

      <WidgetConfigProvider
        config={{
          appName: 'Demo App',
          connectedWallets: { default: walletAddress },
          intentsAccountType: 'near',
          chainsFilter: {
            target: {
              intents: showAppBalance ? 'all' : 'none',
              external: 'all',
            },
            source: {
              intents: showAppBalance ? appBalanceMode : 'none',
              external: walletAddress ? 'wallet-supported' : 'all',
            },
          },
        }}>
        <WidgetComponent
          isFullPage
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
    </>
  );
};
