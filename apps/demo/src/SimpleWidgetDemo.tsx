import {
  WidgetConfigProvider,
  WidgetSwap,
} from '@aurora-is-near/intents-swap-widget';
import { useAppKitWallet } from './hooks/useAppKitWallet';
import { WalletConnectButton } from './components/WalletConnectButton';

export const SimpleWidgetDemo = () => {
  const { address: walletAddress, isConnecting: isLoading } = useAppKitWallet();

  return (
    <WidgetConfigProvider
      config={{ connectedWallets: { default: walletAddress } }}>
      <WidgetSwap
        isFullPage
        isLoading={isLoading}
        FooterComponent={<WalletConnectButton />}
      />
    </WidgetConfigProvider>
  );
};
