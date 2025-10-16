import { useMemo } from 'react';

import { noop } from '@/utils/noop';
import { BalanceRpcLoader } from '@/features/BalanceRpcLoader';
import { defaultConfig, WidgetConfigProvider } from '@/config';
import type { WidgetConfig } from '@/config';

import { RPCS } from './rpcs';
import { WidgetSwap } from './Swap';
import { Skeleton as SwapSkeleton } from './Swap/Skeleton';

type Props = {
  isLoading: boolean;
  walletAddress: string | undefined;
};

export default function WidgetPage({ isLoading, walletAddress }: Props) {
  const config: WidgetConfig = useMemo(
    () => ({
      ...defaultConfig,
      walletAddress, // reactively pass connected wallet address
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

  return (
    <div className="flex h-full w-full justify-center pt-[10vh]">
      <WidgetConfigProvider config={config}>
        {!!config.walletAddress && (
          <BalanceRpcLoader rpcs={RPCS} walletAddress={config.walletAddress} />
        )}
        <section className="relative w-[456px]">
          {(() => {
            if (isLoading) {
              return <SwapSkeleton />;
            }

            return (
              <WidgetSwap
                providers={{ near: undefined }}
                makeTransfer={() => Promise.resolve(undefined)}
                onMsg={noop}
              />
            );
          })()}
        </section>
      </WidgetConfigProvider>
    </div>
  );
}
