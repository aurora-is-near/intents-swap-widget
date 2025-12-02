import {
  WidgetConfigProvider,
  WidgetSwap,
} from '@aurora-is-near/intents-swap-widget';

import { PageHeader } from './components/PageHeader';
import { WidgetPageContainer } from './components/WidgetPageContainer';
import { useAppKitWallet } from './hooks/useAppKitWallet';

export const SimpleWidgetDemo = () => {
  const {
    providers,
    address: walletAddress,
    isConnecting: isLoading,
  } = useAppKitWallet();

  return (
    <>
      <PageHeader />
      <WidgetPageContainer>
        <WidgetConfigProvider
          config={{ connectedWallets: { default: walletAddress } }}>
          <WidgetSwap
            isFullPage={false}
            isLoading={isLoading}
            providers={providers}
          />
        </WidgetConfigProvider>
      </WidgetPageContainer>
    </>
  );
};
