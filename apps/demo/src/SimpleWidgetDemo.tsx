import {
  WidgetConfigProvider,
  WidgetSwap,
} from '@aurora-is-near/intents-swap-widget';
import { useState } from 'react';

import { Toggle } from './components/Toggle';
import { PageHeader } from './components/PageHeader';
import { WidgetPageContainer } from './components/WidgetPageContainer';
import { useAppKitWallet } from './hooks/useAppKitWallet';

export const SimpleWidgetDemo = () => {
  const {
    providers,
    address: walletAddress,
    isConnecting: isLoading,
  } = useAppKitWallet();

  const [showAppBalance, setShowAppBalance] = useState(true);

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
            HeaderComponent={
              <Toggle
                isOn={showAppBalance}
                label="Show app balance"
                onToggle={setShowAppBalance}
              />
            }
          />
        </WidgetConfigProvider>
      </WidgetPageContainer>
    </>
  );
};
