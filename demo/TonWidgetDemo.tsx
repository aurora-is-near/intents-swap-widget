import { useDemoWallet } from './hooks/useDemoWallet';
import { WidgetSwap } from '../src';
import { WidgetConfigProvider } from '../src/config';
import { DemoConnectButton } from './components/DemoConnectButton';

export const TonWidgetDemo = () => {
  const {
    address: walletAddress,
    isConnecting: isLoading,
    connect: handleConnectWallet,
  } = useDemoWallet();

  return (
    <>
      <div className="demo-widget-content">
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
            makeTransfer={() => Promise.resolve(undefined)}
            onMsg={() => {}}
          />
          <DemoConnectButton
            walletAddress={walletAddress}
            onConnect={handleConnectWallet}
          />
        </WidgetConfigProvider>
      </div>
    </>
  );
};
