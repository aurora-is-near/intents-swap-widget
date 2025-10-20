import { useState } from 'react';
import WidgetDemo from './WidgetDemo';
import { useDemoWallet } from './hooks/useDemoWallet';

type WidgetType = 'swap' | 'deposit' | 'withdraw';

export const App = () => {
  const {
    address: walletAddress,
    isConnecting: isLoading,
    connect: handleConnectWallet,
    disconnect: handleDisconnectWallet,
  } = useDemoWallet();

  const [selectedWidget, setSelectedWidget] = useState<WidgetType>('swap');

  const DEMO_WIDGETS = [
    { id: 'swap', label: 'Swap', iconPath: '/demo/icons/swap.svg' },
    { id: 'deposit', label: 'Deposit', iconPath: '/demo/icons/deposit.svg' },
    { id: 'withdraw', label: 'Withdraw', iconPath: '/demo/icons/withdraw.svg' },
  ] as const;

  return (
    <div className="demo-page-wrapper">
      {/* Elegant wallet connection */}
      <div className="wallet-connect-container">
        {walletAddress ? (
          <div className="flex items-center gap-3">
            <div className="wallet-status">
              <div className="wallet-indicator"></div>
              <span className="wallet-address">{walletAddress}</span>
            </div>
            <button
              onClick={handleDisconnectWallet}
              className="disconnect-button">
              Disconnect
            </button>
          </div>
        ) : (
          <button
            onClick={handleConnectWallet}
            disabled={isLoading}
            className="connect-button">
            {isLoading ? (
              <>
                <div className="connect-button-spinner"></div>
                Connecting...
              </>
            ) : (
              'Connect Wallet'
            )}
          </button>
        )}
      </div>

      {/* Main Content - centered widget */}
      <div className="demo-widget-container">
        <div className="demo-widget-content">
          {/* Widget Type Navigation - exact Calyx style */}
          <nav className="demo-nav">
            {DEMO_WIDGETS.map((widget) => (
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

          {/* Widget Container */}
          <WidgetDemo
            widgetType={selectedWidget}
            isLoading={isLoading}
            walletAddress={walletAddress}
            onConnectWallet={handleConnectWallet}
          />
        </div>
      </div>
    </div>
  );
};
