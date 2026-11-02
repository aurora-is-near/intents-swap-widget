import type { Account } from '../accounts/types';
import { useActiveTab } from '../hooks/useActiveTab';
import { CONNECTOR_URL } from '../wallet/connectorWindow';
import { usePageWallets } from '../wallet/usePageWallets';

export type SiteConnection = { host: string; favIconUrl?: string };

const CONNECTOR_ORIGIN = new URL(CONNECTOR_URL).origin;

/** The open web page's host, unless it's the extension's own connector. */
const siteHost = (url: string | undefined) => {
  if (!url || !/^https?:/.test(url)) {
    return null;
  }

  const parsed = new URL(url);

  return parsed.origin === CONNECTOR_ORIGIN ? null : parsed.hostname;
};

/**
 * Whether the open site is connected with the active account's own wallet
 * and address, read from the site's page without prompting. WalletConnect
 * sessions live on the phone, so they're never reported here.
 */
export const useSiteConnection = (account: Account): SiteConnection | null => {
  const tab = useActiveTab();
  const host = siteHost(tab?.url);
  const isBrowserWallet =
    account.kind === 'wallet' && account.source !== 'walletconnect';

  const page = usePageWallets(host && isBrowserWallet ? tab?.tabId : undefined);

  if (!host || account.kind !== 'wallet' || page.status !== 'ready') {
    return null;
  }

  const address = account.address.toLowerCase();
  const isConnected = page.wallets.some(
    (wallet) =>
      wallet.id === account.walletId &&
      wallet.siteAddress?.toLowerCase() === address,
  );

  return isConnected ? { host, favIconUrl: tab?.favIconUrl } : null;
};
