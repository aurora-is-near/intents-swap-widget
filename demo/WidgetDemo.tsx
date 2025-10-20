import { useMemo } from 'react';
import { noop } from '@/utils/noop';
import { BalanceRpcLoader } from '@/features/BalanceRpcLoader';
import { defaultConfig, WidgetConfigProvider } from '@/config';
import { WidgetSwap } from '@/presets/widgets/WidgetSwap';
import { WidgetDeposit } from '@/presets/widgets/WidgetDeposit';
import { WidgetWithdraw } from '@/presets/widgets/WidgetWithdraw';
import { WidgetSkeleton } from '@/presets/widgets/shared/WidgetSkeleton';
import type { WidgetConfig } from '@/config';
import { RPCS } from './rpcs';
import { DemoConnectButton } from './components/DemoConnectButton';

type WidgetType = 'swap' | 'deposit' | 'withdraw';

type Props = {
  widgetType: WidgetType;
  isLoading: boolean;
  walletAddress: string | undefined;
  onConnectWallet: () => void;
};

export default function WidgetDemo({
  widgetType,
  isLoading,
  walletAddress,
  onConnectWallet,
}: Props) {
  const config: WidgetConfig = useMemo(
    () => ({
      ...defaultConfig,
      walletAddress,
      walletSupportedChains: ['near'],
      intentsAccountType: 'near',
      chainsFilter: {
        target: { intents: 'all', external: 'all' },
        source: {
          intents: walletAddress ? 'with-balance' : 'all',
          external: walletAddress ? 'wallet-supported' : 'all',
        },
      },
    }),
    [walletAddress],
  );

  const WIDGET_CONFIG = {
    swap: { Component: WidgetSwap, Skeleton: WidgetSkeleton.Swap },
    deposit: { Component: WidgetDeposit, Skeleton: WidgetSkeleton.Deposit },
    withdraw: { Component: WidgetWithdraw, Skeleton: WidgetSkeleton.Withdraw },
  } as const;

  const renderWidget = () => {
    const widgetConfig = WIDGET_CONFIG[widgetType];

    if (isLoading) {
      return <widgetConfig.Skeleton />;
    }

    const commonProps = {
      providers: { near: undefined },
      makeTransfer: () =>
        Promise.resolve({
          hash: '0x1234567890abcdef1234567890abcdef12345678',
          transactionLink:
            'https://example.com/tx/0x1234567890abcdef1234567890abcdef12345678',
        }),
      onMsg: noop,
    };

    return <widgetConfig.Component {...commonProps} />;
  };

  return (
    <WidgetConfigProvider config={config}>
      {!!config.walletAddress && (
        <BalanceRpcLoader rpcs={RPCS} walletAddress={config.walletAddress} />
      )}
      <div style={{ position: 'relative' }}>
        {renderWidget()}
        <DemoConnectButton
          walletAddress={walletAddress}
          onConnect={onConnectWallet}
        />
      </div>
    </WidgetConfigProvider>
  );
}
