import { useMemo, useState } from 'react';

import { createIntentsConnectApi } from '@aurora-is-near/intents-connect';
import { IntentsConnectProvider } from '@aurora-is-near/intents-connect/react';
import {
  EVM_SOLANA_WALLET_OPTION,
  WalletSelectorModal,
} from '@aurora-is-near/intents-connect-wallet/connect';
import {
  AppKitProvider,
  useIntentsConnectWallet,
} from '@aurora-is-near/intents-connect-wallet/connect/appkit';
import {
  Button,
  WidgetConfigProvider,
} from '@aurora-is-near/intents-swap-widget';

import { Layout } from './components/Layout';
import { buildHydrexPlan } from './utils/hydrex';
import { walletFamilyMap } from './utils/walletFamilyMap';
import * as constants from './constants';

const api = createIntentsConnectApi({
  baseUrl: constants.API_URL,
  apiKey: constants.API_KEY,
});

const AppContent = () => {
  const [pickWallet, setPickWallet] = useState(false);
  const { wallet, address, family, isConnected, connect, disconnect } =
    useIntentsConnectWallet();

  const config = useMemo(
    () => ({
      apiKey: constants.API_KEY,
      alchemyApiKey: constants.ALCHEMY_API_KEY,
      connectedWallets: walletFamilyMap(family, address),
    }),
    [family, address],
  );

  return (
    <IntentsConnectProvider api={api} wallet={wallet}>
      <WidgetConfigProvider
        config={config}
        balanceViaRpc={false}
        theme={{ colorScheme: 'dark' }}>
        <div className="sw my-sw-6xl mx-auto px-sw-xl">
          <Layout
            HeaderComponent={
              <div className="flex items-center justify-between gap-sw-lg pt-sw-md">
                <h1 className="text-sw-h5">
                  Deposit into <span className="text-[#00C896]">Hydrex</span>
                </h1>
                <Button
                  size="sm"
                  variant="outlined"
                  className="w-fit py-sw-sm"
                  onClick={() => {
                    if (isConnected) {
                      void disconnect();
                    } else {
                      setPickWallet(true);
                    }
                  }}>
                  {address
                    ? `Disconnect ${address.slice(0, 4)}…${address.slice(-3)}`
                    : 'Connect wallet'}
                </Button>
              </div>
            }
            alchemyApiKey={constants.ALCHEMY_API_KEY}
            buildPlan={buildHydrexPlan}
          />

          <WalletSelectorModal
            open={pickWallet}
            onClose={() => setPickWallet(false)}
            options={[EVM_SOLANA_WALLET_OPTION]}
            onSelect={() => {
              setPickWallet(false);
              void connect();
            }}
          />
        </div>
      </WidgetConfigProvider>
    </IntentsConnectProvider>
  );
};

export const App = () => (
  <AppKitProvider appName="Intents Connect Demo" themeMode="dark">
    <AppContent />
  </AppKitProvider>
);
