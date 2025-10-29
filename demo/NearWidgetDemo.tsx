import { useState } from 'react';
import {
  useWalletSelector,
  WalletSelectorProvider,
} from '@near-wallet-selector/react-hook';
import { setupMyNearWallet } from '@near-wallet-selector/my-near-wallet';
import { setupMeteorWallet } from '@near-wallet-selector/meteor-wallet';
import { NetworkId } from '@near-wallet-selector/core';
import { WidgetConfigProvider } from '@/config';
import { WidgetSwap } from '@/widgets/WidgetSwap';
import { WidgetDeposit } from '@/widgets/WidgetDeposit';
import { WidgetWithdraw } from '@/widgets/WidgetWithdraw';
import { useNearAccount } from '@/hooks/useNearAccount';
import { NearWalletConnectButton } from './components/WalletConnectButton';

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

type WidgetType = keyof typeof WIDGET_TYPES;

const config = {
  network: 'mainnet' as NetworkId,
  fallbackRpcUrls: [
    'https://relmn.aurora.dev',
    'https://free.rpc.fastnear.com',
    'https://rpc.mainnet.near.org',
  ],
  modules: [
    setupMyNearWallet(),
    setupMeteorWallet(),
    // add other setup functions
  ],
};

const NearWidget = (props: { selectedWidget: WidgetType }) => {
  const { signedAccountId: walletAddress } = useWalletSelector();
  const { data: account } = useNearAccount(walletAddress);

  const WidgetComponent = WIDGET_TYPES[props.selectedWidget];

  return (
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
      <WidgetComponent FooterComponent={<NearWalletConnectButton />} />
    </WidgetConfigProvider>
  );
};

export const NearWidgetDemo = () => {
  const [selectedWidget, setSelectedWidget] = useState<WidgetType>('swap');

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

      <WalletSelectorProvider config={config}>
        <NearWidget selectedWidget={selectedWidget} />
      </WalletSelectorProvider>
    </>
  );
};
