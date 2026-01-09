import { useEffect, useState } from 'react';
import { DownloadW700 as Download } from '@material-symbols-svg/react-rounded/icons/download';
import { SendW700 as Send } from '@material-symbols-svg/react-rounded/icons/send';
import { RepeatW700 as Repeat } from '@material-symbols-svg/react-rounded/icons/repeat';

import {
  guardStates,
  useUnsafeSnapshot,
  WidgetConfigProvider,
  WidgetDeposit,
  WidgetSwap,
  WidgetWithdraw,
} from '@aurora-is-near/intents-swap-widget';
import type { Theme } from '@aurora-is-near/intents-swap-widget';

import { Toggle } from './components/Toggle';
import { PageHeader } from './components/PageHeader';
import { WidgetPageContainer } from './components/WidgetPageContainer';
import { useAppKitWallet } from './hooks/useAppKitWallet';

type WidgetType = 'swap' | 'deposit' | 'withdraw';

const defaultTheme: Theme = {
  primaryColor: '#D5B7FF',
  surfaceColor: '#24262D',
  colorScheme: 'dark',
};

const WIDGET_TABS = [
  { id: 'swap', label: 'Swap', icon: Repeat },
  { id: 'deposit', label: 'Deposit', icon: Download },
  { id: 'withdraw', label: 'Withdraw', icon: Send },
] as const;

const WIDGET_TYPES = {
  swap: WidgetSwap,
  deposit: WidgetDeposit,
  withdraw: WidgetWithdraw,
} as const;

type Props = {
  isLoading: boolean;
  showAppBalance: boolean;
  selectedWidget: WidgetType;
  setShowAppBalance: (showAppBalance: boolean) => void;
};

const Content = ({
  isLoading,
  selectedWidget,
  showAppBalance,
  setShowAppBalance,
}: Props) => {
  const { ctx } = useUnsafeSnapshot();
  const { providers } = useAppKitWallet();

  const WidgetComponent = WIDGET_TYPES[selectedWidget];

  const isTransferSuccess = guardStates(ctx, ['transfer_success']);

  return (
    <WidgetComponent
      isFullPage={false}
      isLoading={isLoading}
      providers={providers}
      HeaderComponent={
        isTransferSuccess ? null : (
          <Toggle
            isOn={showAppBalance}
            label="Show app balance"
            onToggle={setShowAppBalance}
          />
        )
      }
    />
  );
};

const getSourceTokens = (
  selectedWidget: WidgetType,
  showAppBalance: boolean,
  walletAddress: string | undefined,
) => {
  return {
    intents: (() => {
      if (!showAppBalance) {
        return 'none' as const;
      }

      if (selectedWidget === 'deposit') {
        return 'none' as const;
      }

      if (selectedWidget === 'withdraw') {
        return 'with-balance' as const;
      }

      return walletAddress ? ('with-balance' as const) : ('all' as const);
    })(),

    external: (() => {
      if (selectedWidget === 'withdraw') {
        return 'none' as const;
      }

      if (selectedWidget === 'deposit') {
        return 'wallet-supported' as const;
      }

      return walletAddress ? ('wallet-supported' as const) : ('all' as const);
    })(),
  };
};

const getTargetTokens = (
  selectedWidget: WidgetType,
  showAppBalance: boolean,
) => {
  return {
    intents: (() => {
      if (!showAppBalance) {
        return 'none' as const;
      }

      if (selectedWidget === 'withdraw') {
        return 'none' as const;
      }

      if (selectedWidget === 'deposit') {
        return 'all' as const;
      }

      return 'with-balance' as const;
    })(),

    external: (() => {
      if (selectedWidget === 'withdraw') {
        return 'all' as const;
      }

      if (selectedWidget === 'deposit') {
        return 'none' as const;
      }

      return 'all' as const;
    })(),
  };
};

export const TabbedWidgetsDemo = () => {
  const { address: walletAddress, isConnecting: isLoading } = useAppKitWallet();

  const [showAppBalance, setShowAppBalance] = useState(true);

  const [theme, setTheme] = useState<Theme>(defaultTheme);
  const [selectedWidget, setSelectedWidget] = useState<WidgetType>('swap');

  const targetTokens = getTargetTokens(selectedWidget, showAppBalance);
  const sourceTokens = getSourceTokens(
    selectedWidget,
    showAppBalance,
    walletAddress,
  );

  useEffect(() => {
    if (!showAppBalance) {
      setSelectedWidget('swap');
    }
  }, [showAppBalance]);

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
        }>
        <PageHeader.Nav
          activeTab={selectedWidget}
          tabs={showAppBalance ? WIDGET_TABS : [WIDGET_TABS[0]]}
          onClick={(tab) => setSelectedWidget(tab)}
        />
      </PageHeader>

      <WidgetPageContainer>
        <WidgetConfigProvider
          theme={theme}
          config={{
            appName: 'Demo App',
            connectedWallets: { default: walletAddress },
            intentsAccountType: 'evm',
            hideTokenInputHeadings: true,
            chainsFilter: {
              target: targetTokens,
              source: sourceTokens,
            },
          }}>
          <Content
            isLoading={isLoading}
            showAppBalance={showAppBalance}
            setShowAppBalance={setShowAppBalance}
            selectedWidget={selectedWidget}
          />
        </WidgetConfigProvider>
      </WidgetPageContainer>
    </>
  );
};
