import { useEffect, useRef } from 'react';

import { useAccounts } from '../accounts/useAccounts';
import { useNavigation } from '../navigation';
import { usePageWallets } from '../wallet/usePageWallets';
import { unsupportedReason } from './connectors';
import { useAppLaunch } from './useAppLaunch';

const same = (a: string, b: string) => a.toLowerCase() === b.toLowerCase();

/**
 * Opens the app a site's "Deposit with Aurora" button asked for. When the
 * active account can't use apps (a passkey) but one of the wallet accounts is
 * the wallet signed in on that site, it switches to that account first.
 */
export const AppLaunchHandler = () => {
  const { launch, consume } = useAppLaunch();
  const { accounts, active, setActive } = useAccounts();
  const { reset, push } = useNavigation();
  const page = usePageWallets(launch?.tabId);
  const handled = useRef<number | null>(null);

  const canUseApps = active?.kind === 'wallet' && !unsupportedReason(active);

  // The site's wallet, for the account switch.
  const siteAddress =
    page.status === 'ready'
      ? (page.wallets.find((wallet) => wallet.isSiteWallet)?.siteAddress ??
        null)
      : undefined;

  const match =
    siteAddress && !canUseApps
      ? accounts.find(
          (account) =>
            account.kind === 'wallet' &&
            !unsupportedReason(account) &&
            same(account.address, siteAddress),
        )
      : undefined;

  useEffect(() => {
    if (!launch || handled.current === launch.at || !active) {
      return;
    }

    // Wait for the site's wallet before deciding (unless it can't matter).
    if (!canUseApps && page.status === 'loading') {
      return;
    }

    handled.current = launch.at;

    const open = () => {
      reset({ name: 'home' });
      push({ name: 'apps' });
      push({
        name: 'polymarket',
        launch: { tabId: launch.tabId, account: launch.account },
      });
      consume();
    };

    if (match && match.id !== active.id) {
      void setActive(match.id).then(open);
    } else {
      open();
    }
  }, [launch, active, canUseApps, page.status, match]);

  return null;
};
