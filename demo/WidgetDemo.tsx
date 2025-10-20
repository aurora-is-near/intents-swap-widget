import { useMemo } from 'react';
import { noop } from '@/utils/noop';
import { BalanceRpcLoader } from '@/features/BalanceRpcLoader';
import { defaultConfig, WidgetConfigProvider } from '@/config';
import { WidgetSwap } from '@/widgets/WidgetSwap';
import { WidgetDeposit } from '@/widgets/WidgetDeposit';
import { WidgetWithdraw } from '@/widgets/WidgetWithdraw';
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

const WIDGET_TYPES = {
  swap: WidgetSwap,
  deposit: WidgetDeposit,
  withdraw: WidgetWithdraw,
} as const;

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

  const WidgetComponent = WIDGET_TYPES[widgetType];

  return (
    <WidgetConfigProvider config={config}>
      {!!config.walletAddress && (
        <BalanceRpcLoader rpcs={RPCS} walletAddress={config.walletAddress} />
      )}
      <div style={{ position: 'relative' }}>
        <WidgetComponent
          isLoading={isLoading}
          providers={{ near: undefined }}
          makeTransfer={() =>
            Promise.resolve({
              hash: '0x1234567890abcdef1234567890abcdef12345678',
              transactionLink:
                'https://example.com/tx/0x1234567890abcdef1234567890abcdef12345678',
            })
          }
          onMsg={noop}
        />
        <DemoConnectButton
          walletAddress={walletAddress}
          onConnect={onConnectWallet}
        />
      </div>
    </WidgetConfigProvider>
  );
}
