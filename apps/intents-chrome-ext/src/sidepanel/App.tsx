import { useEffect, useMemo, useRef, useState } from 'react';

import { createIntentsConnectApi } from '@aurora-is-near/intents-connect';
import { IntentsConnectProvider } from '@aurora-is-near/intents-connect/react';
import { WidgetConfigProvider } from '@aurora-is-near/intents-swap-widget';

import { ALCHEMY_API_KEY, API_KEY, API_URL } from './config';
import { useActiveTab } from './hooks/useActiveTab';
import { findIntegrationForUrl } from './integrations/registry';
import type { IntegrationId } from './integrations/registry';
import { PolymarketScreen } from './integrations/polymarket/components/PolymarketScreen';
import { HomeScreen } from './screens/HomeScreen';
import { usePageWallet } from './wallet/usePageWallet';

const api = createIntentsConnectApi({ baseUrl: API_URL, apiKey: API_KEY });

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
  const wallet = usePageWallet(
    screen === 'polymarket' ? polymarketTabId : undefined,
  );

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

  const address = wallet.status === 'connected' ? wallet.address : undefined;
  const config = useMemo(
    () => ({
      apiKey: API_KEY,
      alchemyApiKey: ALCHEMY_API_KEY,
      connectedWallets: address ? { default: address } : {},
    }),
    [address],
  );

  if (!isLoaded) {
    return null;
  }

  return (
    <IntentsConnectProvider
      api={api}
      wallet={wallet.status === 'connected' ? wallet.connector : null}>
      <WidgetConfigProvider
        config={config}
        balanceViaRpc={false}
        theme={{ colorScheme: 'dark' }}>
        <main className="flex flex-col px-sw-xl pb-sw-2xl">
          {screen === 'home' && (
            <HomeScreen activeUrl={activeTab?.url} onOpen={setScreen} />
          )}
          {screen === 'polymarket' && (
            <PolymarketScreen
              tabId={polymarketTabId}
              wallet={wallet}
              onBack={() => setScreen('home')}
            />
          )}
        </main>
      </WidgetConfigProvider>
    </IntentsConnectProvider>
  );
};
