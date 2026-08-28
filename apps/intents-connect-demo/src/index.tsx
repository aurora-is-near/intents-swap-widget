import { useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';

import '@aurora-is-near/intents-swap-widget/styles.css';
import './shared/index.css';

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

import { Tabs } from './shared/components/Tabs';
import { walletFamilyMap } from './shared/utils/walletFamilyMap';
import { ALCHEMY_API_KEY, API_KEY, API_URL } from './shared/config';
import { HydrexTab } from './hydrex/components/HydrexTab';
import { PolymarketTab } from './polymarket/components/PolymarketTab';

const api = createIntentsConnectApi({
  baseUrl: API_URL,
  apiKey: API_KEY,
});

/**
 * The integration registry lives HERE, not in shared/ — shared knows nothing
 * about which integrations exist, only how to render a row of tabs.
 */
type TabId = 'hydrex' | 'polymarket';

const TABS: { id: TabId; label: string; accent: string }[] = [
  { id: 'hydrex', label: 'Hydrex', accent: '#00C896' },
  { id: 'polymarket', label: 'Polymarket', accent: '#2D9CDB' },
];

const AppContent = () => {
  const [pickWallet, setPickWallet] = useState(false);
  const [tab, setTab] = useState<TabId>('hydrex');
  const [account, setAccount] = useState('');
  const [isBusy, setIsBusy] = useState(false);
  const { wallet, address, family, isConnected, connect, disconnect } =
    useIntentsConnectWallet();

  const config = useMemo(
    () => ({
      apiKey: API_KEY,
      alchemyApiKey: ALCHEMY_API_KEY,
      connectedWallets: walletFamilyMap(family, address),
    }),
    [family, address],
  );

  const { label, accent } = TABS.find(({ id }) => id === tab) ?? TABS[0]!;

  const header = (
    <div className="flex items-center justify-between gap-sw-lg pt-sw-md">
      <h1 className="text-sw-h5">
        Deposit into <span style={{ color: accent }}>{label}</span>
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
  );

  return (
    <IntentsConnectProvider api={api} wallet={wallet}>
      <WidgetConfigProvider
        config={config}
        balanceViaRpc={false}
        theme={{ colorScheme: 'dark' }}>
        <div className="sw my-sw-6xl mx-auto px-sw-xl">
          <Tabs tabs={TABS} active={tab} isLocked={isBusy} onChange={setTab} />

          {/* Exactly one integration is mounted: two would each register the
              widget's balance side effects and double every fetch. Everything
              here is inside WidgetConfigProvider, which mounts the QueryClient
              the panels' queries run on. */}
          {tab === 'hydrex' ? (
            <HydrexTab HeaderComponent={header} onBusyChange={setIsBusy} />
          ) : (
            <PolymarketTab
              HeaderComponent={header}
              account={account}
              onAccountChange={setAccount}
              onBusyChange={setIsBusy}
            />
          )}

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

const App = () => (
  <AppKitProvider appName="Intents Connect Demo" themeMode="dark">
    <AppContent />
  </AppKitProvider>
);

// No StrictMode: the widget's state machine misbehaves under double-invocation
// (same guidance its own standalone docs give).
createRoot(document.getElementById('root')!).render(<App />);
