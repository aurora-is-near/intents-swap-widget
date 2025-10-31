import { useState } from 'react';
import { WalletSelectorProvider } from '@near-wallet-selector/react-hook';
import { setupMeteorWallet } from '@near-wallet-selector/meteor-wallet';
import { NetworkId } from '@near-wallet-selector/core';
import {
  WidgetConfigProvider,
  WidgetDeposit,
  WidgetSwap,
  WidgetWithdraw,
} from '@aurora-is-near/intents-swap-widget';
import { NearWalletConnectButton } from './components/WalletConnectButton';
import { useNearWallet } from './hooks/useNearWallet';

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
    setupMeteorWallet(),
    // add other setup functions
  ],
};

const NearWidget = (props: { selectedWidget: WidgetType }) => {
  const { address: walletAddress } = useNearWallet();

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
  const [selectedWidget] = useState<WidgetType>('swap');

  return (
    <>
      <WalletSelectorProvider config={config}>
        <NearWidget selectedWidget={selectedWidget} />
      </WalletSelectorProvider>
    </>
  );
};
