import { createContext, useContext, useMemo, useState } from 'react';
import type { PropsWithChildren } from 'react';

import type { Token } from '@aurora-is-near/intents-swap-widget';

import type { ActivityFilter, ActivityTransaction } from './activity/activity';
import type { DepositNetwork } from './deposit/networks';
import type { DetectedWallet } from './wallet/types';

/**
 * Connecting a secondary wallet for the active account, instead of a new
 * account (the default): a browser wallet only, back to `returnTo` after.
 */
export type ConnectRole = {
  kind: 'secondary';
  returnTo: 'wallets' | 'swap' | 'send' | 'home';
};

type Screen =
  | { name: 'welcome' }
  | { name: 'createPasskey' }
  | { name: 'passkeyCreated'; accountId: string }
  | { name: 'connectWallet' }
  | { name: 'browserWallets'; role?: ConnectRole }
  | { name: 'connectBrowserWallet'; wallet: DetectedWallet; role?: ConnectRole }
  | { name: 'walletConnect' }
  | { name: 'verifyWallet' }
  | { name: 'home' }
  | { name: 'deposit' }
  | { name: 'depositDetail'; network: DepositNetwork['id'] }
  // `source`: start from this token instead of the largest holding.
  | { name: 'swap'; source?: Token }
  | { name: 'send'; source?: Token }
  | { name: 'asset'; token: Token }
  | { name: 'activity'; filter?: ActivityFilter }
  | { name: 'apps' }
  // `launch`: opened from the site's "Deposit with Aurora" (its tab and the
  // account the page showed), so that account is used.
  | { name: 'polymarket'; launch?: { tabId: number; account?: string } }
  | { name: 'appExecution'; executionId: string }
  | { name: 'activityDetail'; transaction: ActivityTransaction }
  | { name: 'settings' }
  | { name: 'wallets' };

type Navigation = {
  screen: Screen;
  push: (screen: Screen) => void;
  /** Swaps the current screen for another, keeping what's under it. */
  replace: (screen: Screen) => void;
  /** Replaces the whole stack, e.g. after onboarding. */
  reset: (screen: Screen) => void;
  back: () => void;
  /** Back to the nearest screen of that name; home when there is none. */
  popTo: (name: Screen['name']) => void;
};

const NavigationContext = createContext<Navigation | null>(null);

export const NavigationProvider = ({
  initial,
  children,
}: PropsWithChildren<{ initial: Screen }>) => {
  const [stack, setStack] = useState<Screen[]>([initial]);

  const value = useMemo<Navigation>(
    () => ({
      screen: stack[stack.length - 1] ?? initial,
      push: (screen) => setStack((current) => [...current, screen]),
      replace: (screen) =>
        setStack((current) => [...current.slice(0, -1), screen]),
      reset: (screen) => setStack([screen]),
      back: () =>
        setStack((current) =>
          current.length > 1 ? current.slice(0, -1) : current,
        ),
      popTo: (name) =>
        setStack((current) => {
          const index = current.map((item) => item.name).lastIndexOf(name);

          return index === -1
            ? [{ name: 'home' }]
            : current.slice(0, index + 1);
        }),
    }),
    [stack, initial],
  );

  return (
    <NavigationContext.Provider value={value}>
      {children}
    </NavigationContext.Provider>
  );
};

export const useNavigation = () => {
  const navigation = useContext(NavigationContext);

  if (!navigation) {
    throw new Error('useNavigation must be used inside NavigationProvider');
  }

  return navigation;
};
