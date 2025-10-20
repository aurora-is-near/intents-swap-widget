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

  const renderWidget = () => {
    if (isLoading) {
      switch (widgetType) {
        case 'swap':
          return <WidgetSkeleton.Swap />;
        case 'deposit':
          return <WidgetSkeleton.Deposit />;
        case 'withdraw':
          return <WidgetSkeleton.Withdraw />;
        default:
          return <WidgetSkeleton.Swap />;
      }
    }

    const commonProps = {
      providers: { near: undefined },
      makeTransfer: () =>
        Promise.resolve({
          hash: '0x1234567890abcdef1234567890abcdef12345678',
          transactionLink: 'https://example.com/tx/0x1234567890abcdef1234567890abcdef12345678',
        }),
      onMsg: noop,
    };

    switch (widgetType) {
      case 'swap':
        return <WidgetSwap {...commonProps} />;
      case 'deposit':
        return <WidgetDeposit {...commonProps} />;
      case 'withdraw':
        return <WidgetWithdraw {...commonProps} />;
      default:
        return <WidgetSwap {...commonProps} />;
    }
  };

  return (
    <WidgetConfigProvider config={config}>
      {!!config.walletAddress && (
        <BalanceRpcLoader rpcs={RPCS} walletAddress={config.walletAddress} />
      )}
      <div style={{ position: 'relative' }}>
        {renderWidget()}
        {!walletAddress && (
          <div
            style={{
              position: 'absolute',
              bottom: '-60px',
              left: '0',
              right: '0',
              zIndex: 10,
            }}>
            <button
              onClick={onConnectWallet}
              className="demo-connect-wallet-button"
              style={{ width: '100%' }}>
              Connect Wallet
            </button>
          </div>
        )}
      </div>
    </WidgetConfigProvider>
  );
}
