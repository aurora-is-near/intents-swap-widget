import { useState } from 'react';
import {
  WidgetConfigProvider,
  WidgetDeposit,
  WidgetSwap,
  WidgetWithdraw,
} from '@aurora-is-near/intents-swap-widget';
import { useAppKitWallet } from './hooks/useAppKitWallet';
import { WalletConnectButton } from './components/WalletConnectButton';

type WidgetType = 'swap' | 'deposit' | 'withdraw';

const WIDGET_TABS = [
  { id: 'swap', label: 'Swap', iconPath: '/demo/icons/swap.svg' },
  { id: 'deposit', label: 'Deposit', iconPath: '/demo/icons/deposit.svg' },
  { id: 'withdraw', label: 'Withdraw', iconPath: '/demo/icons/withdraw.svg' },
] as const;

const WIDGET_TYPES = {
  swap: WidgetSwap,
  deposit: WidgetDeposit,
  withdraw: WidgetWithdraw,
} as const;

export const TabbedWidgetsDemo = () => {
  const { address: walletAddress, isConnecting: isLoading } = useAppKitWallet();

  const [selectedWidget, setSelectedWidget] = useState<WidgetType>('swap');

  const WidgetComponent = WIDGET_TYPES[selectedWidget];

  return (
    <>
      <nav className="demo-nav">
        {WIDGET_TABS.map((widget) => (
          <button
            key={widget.id}
            onClick={() => setSelectedWidget(widget.id)}
            className={`demo-nav-button ${
              selectedWidget === widget.id ? 'active' : 'inactive'
            }`}
            type="button">
            <img
              src={widget.iconPath}
              alt={`${widget.label} icon`}
              className="demo-nav-icon"
              width={24}
              height={24}
            />
            <span className="demo-nav-label">{widget.label}</span>
          </button>
        ))}
      </nav>

      <WidgetConfigProvider
        config={{
          appName: 'Demo App',
          walletAddress,
          intentsAccountType: 'near',
          chainsFilter: {
            target: { intents: 'all', external: 'all' },
            source: {
              intents: walletAddress ? 'with-balance' : 'all',
              external: walletAddress ? 'wallet-supported' : 'all',
            },
          },
        }}>
        <WidgetComponent
          isLoading={isLoading}
          FooterComponent={<WalletConnectButton />}
        />
      </WidgetConfigProvider>
    </>
  );
};
