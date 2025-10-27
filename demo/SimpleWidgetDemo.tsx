import { WidgetConfigProvider } from '@/config';
import { WidgetSwap } from '@/widgets/WidgetSwap';
import { useAppKitWallet } from './hooks/useAppKitWallet';
import { WalletConnectButton } from './components/WalletConnectButton';

export const SimpleWidgetDemo = () => {
  const { address: walletAddress, isConnecting: isLoading } = useAppKitWallet();

  return (
    <div className="demo-widget-container">
      <WidgetConfigProvider
        config={{
          appName: 'Demo App',
          walletAddress,
        }}>
        <WidgetSwap
          isLoading={isLoading}
          FooterComponent={<WalletConnectButton />}
        />
      </WidgetConfigProvider>
    </div>
  );
};
