import { WidgetConfigProvider } from '@/config';
import { WidgetSwap } from '@/widgets/WidgetSwap';
import { useAppKitWallet } from './hooks/useAppKitWallet';
import { WalletConnectButton } from './components/WalletConnectButton';

export const SimpleWidgetDemo = () => {
  const { address: walletAddress, isConnecting: isLoading } = useAppKitWallet();

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
      <div className="relative">
        <WidgetSwap isLoading={isLoading} />
      </div>
      <div className="demo-widget-footer">
        <WalletConnectButton className="mt-2" />
      </div>
    </WidgetConfigProvider>
  );
};
