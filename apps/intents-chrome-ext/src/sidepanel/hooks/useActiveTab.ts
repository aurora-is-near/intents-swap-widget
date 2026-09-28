import { useEffect, useState } from 'react';

export type ActiveTab = { tabId: number; url: string | undefined };

const queryActiveTab = async (): Promise<ActiveTab | null> => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

  return tab?.id === undefined ? null : { tabId: tab.id, url: tab.url };
};

/** The tab the side panel sits next to; follows tab switches and navigation. */
export const useActiveTab = () => {
  const [activeTab, setActiveTab] = useState<ActiveTab | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const refresh = () => {
      void queryActiveTab().then((tab) => {
        if (!cancelled) {
          setActiveTab(tab);
          setIsLoaded(true);
        }
      });
    };

    const onUpdated = (_tabId: number, change: chrome.tabs.OnUpdatedInfo) => {
      if (change.url !== undefined || change.status === 'complete') {
        refresh();
      }
    };

    refresh();
    chrome.tabs.onActivated.addListener(refresh);
    chrome.tabs.onUpdated.addListener(onUpdated);

    return () => {
      cancelled = true;
      chrome.tabs.onActivated.removeListener(refresh);
      chrome.tabs.onUpdated.removeListener(onUpdated);
    };
  }, []);

  return { activeTab, isLoaded };
};
