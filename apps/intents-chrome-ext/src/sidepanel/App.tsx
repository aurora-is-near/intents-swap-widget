import { useEffect, useMemo, useRef, useState } from 'react';

import { WidgetConfigProvider } from '@aurora-is-near/intents-swap-widget';

import { ALCHEMY_API_KEY, API_KEY } from './config';
import { useActiveTab } from './hooks/useActiveTab';
import { findIntegrationForUrl } from './integrations/registry';
import type { IntegrationId } from './integrations/registry';
import { PolymarketScreen } from './integrations/polymarket/components/PolymarketScreen';
import { HomeScreen } from './screens/HomeScreen';
import { usePageWallets } from './wallet/usePageWallets';
import { useWalletSelection } from './wallet/useWalletSelection';

type Screen = 'home' | IntegrationId;

/**
 * The last Polymarket tab the user looked at. Kept when they switch away, so a
 * running deposit keeps its wallet; dropped when that tab closes.
 */
const usePolymarketTab = (
  activeTab: ReturnType<typeof useActiveTab>['activeTab'],
) => {
  const [tabId, setTabId] = useState<number>();

  useEffect(() => {
    if (
      activeTab &&
      findIntegrationForUrl(activeTab.url)?.id === 'polymarket'
    ) {
      setTabId(activeTab.tabId);
    }
  }, [activeTab]);

  useEffect(() => {
    const onRemoved = (removed: number) =>
      setTabId((current) => (current === removed ? undefined : current));

    chrome.tabs.onRemoved.addListener(onRemoved);

    return () => chrome.tabs.onRemoved.removeListener(onRemoved);
  }, []);

  return tabId;
};

export const App = () => {
  const { activeTab, isLoaded } = useActiveTab();
  const [screen, setScreen] = useState<Screen>('home');
  const polymarketTabId = usePolymarketTab(activeTab);
  const walletsTabId = screen === 'polymarket' ? polymarketTabId : undefined;
  const wallets = usePageWallets(walletsTabId);
  const selection = useWalletSelection(walletsTabId, wallets);

  // Opened on an integration's site: land on that integration directly.
  const routed = useRef(false);

  useEffect(() => {
    if (!isLoaded || routed.current) {
      return;
    }

    routed.current = true;
    const integration = findIntegrationForUrl(activeTab?.url);

    if (integration) {
      setScreen(integration.id);
    }
  }, [isLoaded, activeTab]);

  const { selected } = selection;
  const selectedAddress = selected?.address;

  // Balances follow the selected wallet, handed to the widget as its only
  // (`default`) wallet — whatever its family. The widget resolves the address
  // per token through `default`, so a chain-keyed entry (e.g. `sol`) alone
  // would leave it without an address for the list, and derives the chains
  // to load balances for from the address format. The object's identity keys
  // the balance queries.
  const config = useMemo(
    () => ({
      apiKey: API_KEY,
      alchemyApiKey: ALCHEMY_API_KEY,
      connectedWallets: selectedAddress ? { default: selectedAddress } : {},
    }),
    [selectedAddress],
  );

  if (!isLoaded) {
    return null;
  }

  return (
    <WidgetConfigProvider
      config={config}
      // Alchemy covers EVM and Solana; NEAR balances come from the widget's
      // per-token RPC loader, needed only while a NEAR wallet is selected.
      balanceViaRpc={selected?.family === 'near'}
      theme={{ colorScheme: 'dark' }}>
      <main className="flex flex-col px-sw-xl pb-sw-2xl">
        {screen === 'home' && (
          <HomeScreen activeUrl={activeTab?.url} onOpen={setScreen} />
        )}
        {screen === 'polymarket' && (
          <PolymarketScreen
            tabId={polymarketTabId}
            wallets={wallets}
            selection={selection}
            onBack={() => setScreen('home')}
          />
        )}
      </main>
    </WidgetConfigProvider>
  );
};
