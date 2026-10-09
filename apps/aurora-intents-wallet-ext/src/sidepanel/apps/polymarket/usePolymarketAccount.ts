import { useCallback, useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';

import type { WalletAccount } from '../../accounts/types';
import { usePageWallets } from '../../wallet/usePageWallets';
import { isPolygonAddress } from './account';

const PROFILE_URL = 'https://gamma-api.polymarket.com/public-profile';
const STORAGE_KEY = 'polymarketAccounts';
const POLYMARKET_TABS = 'https://polymarket.com/*';

type Saved = Record<string, string>;

/**
 * The Polymarket account (proxy wallet) behind a signing EOA, from
 * Polymarket's public profile API. `null` when the EOA has no profile yet.
 */
const fetchProxyWallet = async (eoa: string) => {
  const response = await fetch(`${PROFILE_URL}?address=${eoa}`);

  if (response.status === 404) {
    return null;
  }

  if (!response.ok) {
    throw new Error(`Polymarket profile lookup failed (${response.status})`);
  }

  const profile = (await response.json()) as { proxyWallet?: string | null };

  return profile.proxyWallet && isPolygonAddress(profile.proxyWallet)
    ? profile.proxyWallet
    : null;
};

const useProxyWallet = (eoa: string | undefined) =>
  useQuery({
    queryKey: ['polymarket-proxy-wallet', eoa?.toLowerCase()],
    queryFn: () => (eoa ? fetchProxyWallet(eoa) : null),
    enabled: !!eoa,
    staleTime: 5 * 60_000,
    retry: 1,
    refetchOnWindowFocus: false,
  });

/** An open polymarket.com tab, whose page shows which wallet is signed in. */
const usePolymarketTab = () => {
  const [tabId, setTabId] = useState<number>();

  useEffect(() => {
    const find = () => {
      chrome.tabs
        .query({ url: POLYMARKET_TABS })
        .then((tabs) => setTabId(tabs[0]?.id))
        .catch(() => setTabId(undefined));
    };

    find();
    chrome.tabs.onUpdated.addListener(find);
    chrome.tabs.onRemoved?.addListener(find);

    return () => {
      chrome.tabs.onUpdated.removeListener(find);
      chrome.tabs.onRemoved?.removeListener(find);
    };
  }, []);

  return tabId;
};

/** Saved Polymarket accounts, per extension account. */
const useSaved = () => {
  const [saved, setSaved] = useState<Saved>({});
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    void chrome.storage.local.get(STORAGE_KEY).then((stored) => {
      setSaved((stored[STORAGE_KEY] as Saved | undefined) ?? {});
      setIsLoaded(true);
    });

    const onChanged = (
      changes: Record<string, chrome.storage.StorageChange>,
      area: string,
    ) => {
      const change = changes[STORAGE_KEY];

      if (area === 'local' && change) {
        setSaved((change.newValue as Saved | undefined) ?? {});
      }
    };

    chrome.storage.onChanged.addListener(onChanged);

    return () => chrome.storage.onChanged.removeListener(onChanged);
  }, []);

  const write = useCallback(async (update: (current: Saved) => Saved) => {
    const stored = await chrome.storage.local.get(STORAGE_KEY);

    await chrome.storage.local.set({
      [STORAGE_KEY]: update((stored[STORAGE_KEY] as Saved | undefined) ?? {}),
    });
  }, []);

  return { saved, isLoaded, write };
};

type PolymarketAccountSource = 'saved' | 'wallet' | 'site' | 'none';

/**
 * Where the pUSD lands: the account saved for this wallet account, else
 * Polymarket's account for the wallet itself (EVM), else for the wallet
 * signed in on an open polymarket.com tab. Saving one by hand overrides it.
 */
export const usePolymarketAccount = (account: WalletAccount) => {
  const { saved, isLoaded, write } = useSaved();
  const stored = saved[account.id];

  const own = useProxyWallet(
    !stored && account.family === 'evm' ? account.address : undefined,
  );

  // The site's wallet only matters when the account's own has no profile.
  const needsSite = !stored && !own.isLoading && !own.data;
  const tabId = usePolymarketTab();
  const page = usePageWallets(needsSite ? tabId : undefined);
  const siteEoa =
    page.status === 'ready'
      ? (page.wallets.find((wallet) => wallet.isSiteWallet)?.siteAddress ??
        undefined)
      : undefined;

  const site = useProxyWallet(needsSite ? siteEoa : undefined);

  const [address, source]: [string, PolymarketAccountSource] = (() => {
    if (stored) {
      return [stored, 'saved'];
    }

    if (own.data) {
      return [own.data, 'wallet'];
    }

    if (site.data) {
      return [site.data, 'site'];
    }

    return ['', 'none'];
  })();

  return {
    address,
    source,
    isValid: isPolygonAddress(address),
    isLoading: !isLoaded || own.isLoading || site.isLoading,
    save: (value: string) =>
      write((current) => ({ ...current, [account.id]: value })),
    /** Back to the looked-up account. */
    reset: () =>
      write((current) => {
        const { [account.id]: _removed, ...rest } = current;

        return rest;
      }),
  };
};
