import {
  WidgetConfigProvider,
  WidgetSwap,
} from '@aurora-is-near/intents-swap-widget';
import type { Theme } from '@aurora-is-near/intents-swap-widget';
import { useState } from 'react';

import { Toggle } from './components/Toggle';
import { PageHeader } from './components/PageHeader';
import { WidgetPageContainer } from './components/WidgetPageContainer';
import { useAppKitWallet } from './hooks/useAppKitWallet';

const defaultTheme: Theme = {
  primaryColor: '#D5B7FF',
  surfaceColor: '#636D9B',
  colorScheme: 'dark',
};

export const SimpleWidgetDemo = () => {
  const {
    providers,
    address: walletAddress,
    isConnecting: isLoading,
  } = useAppKitWallet();

  const [theme, setTheme] = useState<Theme>(defaultTheme);
  const [showAppBalance, setShowAppBalance] = useState(true);

  return (
    <>
      <PageHeader
        onSetColors={(colors) =>
          setTheme((p) => ({
            colorScheme: p.colorScheme,
            primaryColor: colors.primaryColor,
            surfaceColor: colors.surfaceColor,
          }))
        }
        onToggleTheme={(palette) =>
          setTheme((p) => ({
            colorScheme: palette,
            primaryColor: p.primaryColor,
            surfaceColor: p.surfaceColor,
          }))
        }
      />
      <WidgetPageContainer>
        <WidgetConfigProvider
          config={{ connectedWallets: { default: walletAddress } }}
          theme={theme}>
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
