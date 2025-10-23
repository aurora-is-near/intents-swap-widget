import { useState } from 'react';
import { noop } from '@/utils/noop';
import { BalanceRpcLoader } from '@/features/BalanceRpcLoader';
import { WidgetConfigProvider } from '@/config';
import { WidgetSwap } from '@/widgets/WidgetSwap';
import { WidgetDeposit } from '@/widgets/WidgetDeposit';
import { WidgetWithdraw } from '@/widgets/WidgetWithdraw';
import { RPCS } from './rpcs';
import { useMultiChainWallet } from './hooks/useMultiChainWallet';
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
  const { address: walletAddress, isConnecting: isLoading } =
    useMultiChainWallet();

  const [selectedWidget, setSelectedWidget] = useState<WidgetType>('swap');

  const WidgetComponent = WIDGET_TYPES[selectedWidget];

  return (
    <>
      {/* Main Content - centered widget */}
      <div className="demo-widget-container">
        {/* Widget Type Navigation - exact Calyx style */}
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
            walletSupportedChains: ['near'],
            intentsAccountType: 'near',
            chainsFilter: {
              target: { intents: 'all', external: 'all' },
              source: {
                intents: walletAddress ? 'with-balance' : 'all',
                external: walletAddress ? 'wallet-supported' : 'all',
              },
            },
          }}>
          {!!walletAddress && (
            <BalanceRpcLoader rpcs={RPCS} walletAddress={walletAddress} />
          )}
          <div className="relative">
            <WidgetComponent
              isLoading={isLoading}
              providers={{ near: undefined }}
              makeTransfer={() =>
                Promise.resolve({
                  hash: '0x1234567890abcdef1234567890abcdef12345678',
                  transactionLink:
                    'https://example.com/tx/0x1234567890abcdef1234567890abcdef12345678',
                })
              }
              onMsg={noop}
            />
            <WalletConnectButton className="mt-2" />
          </div>
        </WidgetConfigProvider>
      </div>
    </>
  );
};
