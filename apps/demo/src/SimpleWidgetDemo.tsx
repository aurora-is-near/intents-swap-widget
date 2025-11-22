import {
  WidgetConfigProvider,
  WidgetSwap,
} from '@aurora-is-near/intents-swap-widget';

import { PageHeader } from './components/PageHeader';
import { useAppKitWallet } from './hooks/useAppKitWallet';

export const SimpleWidgetDemo = () => {
  const { address: walletAddress, isConnecting: isLoading } = useAppKitWallet();

  return (
    <>
      <PageHeader />
      <WidgetConfigProvider
        config={{ connectedWallets: { default: walletAddress } }}>
        <WidgetSwap isFullPage isLoading={isLoading} />
      </WidgetConfigProvider>
    </>
  );
};
