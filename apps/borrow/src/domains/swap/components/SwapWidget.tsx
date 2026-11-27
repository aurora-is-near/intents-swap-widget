import '@aurora-is-near/intents-swap-widget/styles.css';

import '../swapWidget.css';
import {
  Widget,
  WidgetConfigProvider,
} from '@aurora-is-near/intents-swap-widget';
import { evm } from '@aurora-is-near/intents-swap-widget-evm';
import { sol } from '@aurora-is-near/intents-swap-widget-solana';
import { stellar } from '@aurora-is-near/intents-swap-widget-stellar';
import { useTheme } from '@aurora-is-near/ui-kit';
import { useMemo } from 'react';
import { ref } from 'valtio';
import type {
  SwapConfidentialMode,
  WidgetConfig,
} from '@aurora-is-near/intents-swap-widget';

import { INTENTS_API_KEY } from '@/config';
import { useConnectWallet } from '@/domains/wallet/hooks/useConnectWallet';
import { useWallet } from '@/domains/wallet/hooks/useWallet';

type SwapWidgetProps = {
  mode: SwapConfidentialMode;
};

/**
 * The swap card: the intents swap widget as it ships, only configured. It
 * signs with the wallet connected in the header, routes confidentially or
 * publicly by `mode`, the Swap mode panel's pick, and takes the app's look
 * from swapWidget.css.
 */
export function SwapWidget({ mode }: SwapWidgetProps) {
  const { address, family, wallet, disconnect } = useWallet();
  const connectWallet = useConnectWallet();
  const { theme } = useTheme();
  // The scheme only: the colours, font and radii are in swapWidget.css.
  const widgetTheme = useMemo(() => ({ colorScheme: theme }), [theme]);

  const config = useMemo<Partial<WidgetConfig>>(
    () => ({
      apiKey: INTENTS_API_KEY,
      confidentialMode: mode,
      connectedWallets: { default: address ?? null },
      intentsAccountType: family ?? undefined,
      // intents-connect types `near` as a signer only, but `useNearConnector`
      // hands over the whole near-connect wallet, which the widget also sends
      // its deposit transactions with. `ref` keeps the wallets' own objects:
      // the widget deep-copies its config, which would rebuild them field by
      // field and lose their private state.
      providers: ref(wallet?.getProviders() ?? {}) as WidgetConfig['providers'],
      plugins: { evm, sol, stellar },
      onWalletSignin: connectWallet,
      // A failed disconnect leaves the wallet connected, which the header
      // and the widget show, as for the header's Disconnect.
      onWalletSignout: () => {
        Promise.resolve(disconnect()).catch(() => {});
      },
    }),
    [mode, address, family, wallet, connectWallet, disconnect],
  );

  return (
    <div className="swap-widget">
      <WidgetConfigProvider config={config} theme={widgetTheme}>
        <Widget defaultMode="swap" />
      </WidgetConfigProvider>
    </div>
  );
}
