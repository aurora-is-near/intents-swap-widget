import { TonConnectButton } from '@tonconnect/ui-react';

import { WidgetSwap } from '../src';
import { WidgetConfigProvider } from '../src/config';
import { WalletConnectButton } from './components/WalletConnectButton';
import { TonPageProviders } from './TonPageProviders';
import { useMultiChainWallet } from './hooks/useMultiChainWallet';

function TonWidgetContent() {
  const {
    address: walletAddress,
    isConnecting: isLoading,
    chainType,
  } = useMultiChainWallet();

  return (
    <div className="demo-widget-container">
      <WidgetConfigProvider
        config={{
          appName: 'Ton Demo App',
          allowedTargetChainsList: ['ton'],
          allowedTargetTokensList: ['nep245:v2_1.omni.hot.tg:1117_'],
          walletAddress,
          walletSupportedChains: ['near'],
          intentsAccountType: 'near',
          chainsFilter: {
            target: { intents: 'none', external: 'all' },
            source: {
              intents: 'none',
              external: walletAddress ? 'wallet-supported' : 'all',
            },
          },
        }}>
        <WidgetSwap
          isOneWay
          isLoading={isLoading}
          providers={{ near: undefined }}
          makeTransfer={(_args) => Promise.resolve(undefined)}
          onMsg={() => {}}
        />
        <div
          style={{
            marginTop: 20,
            display: 'flex',
            flexDirection: 'column',
            gap: 12,
            alignItems: 'center',
          }}>
          {walletAddress ? (
            <div
              style={{
                padding: '8px 16px',
                background: 'rgba(99, 102, 241, 0.1)',
                borderRadius: 8,
                fontSize: 14,
                color: '#6366f1',
              }}>
              Connected via {chainType.toUpperCase()}
            </div>
          ) : null}
          <div
            style={{
              display: 'flex',
              gap: 12,
              flexWrap: 'wrap',
              justifyContent: 'center',
            }}>
            <TonConnectButton />
            <WalletConnectButton />
          </div>
        </div>
      </WidgetConfigProvider>
    </div>
  );
}

export function TonWidgetDemo() {
  return (
    <TonPageProviders>
      <TonWidgetContent />
    </TonPageProviders>
  );
}
