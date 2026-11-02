import { useCallback, useEffect, useMemo, useState } from 'react';

import { isChannelMessage } from '../../shared/bridge';
import type { PanelEvent, WalletState } from '../../shared/bridge';
import { pingPage } from './createPageProvider';
import type { DetectedWallet } from './types';

/** Re-ping while the site has no wallet, so a login there shows up. */
const IDLE_POLL_MS = 3000;

export type PageWallets =
  | { status: 'loading' }
  /** No content script answered — the tab predates the install. */
  | { status: 'no-bridge' }
  | { status: 'ready'; wallets: DetectedWallet[] };

type Snapshot =
  | { status: 'loading' | 'no-bridge' }
  | { status: 'ready'; state: WalletState };

const toDetected = (state: WalletState): DetectedWallet[] => [
  ...state.evm.map((entry) => ({
    id: `evm:${entry.id}`,
    family: 'evm' as const,
    bridgeId: entry.id,
    info: entry.info,
    siteAddress: entry.accounts[0] ?? null,
    isSiteWallet: entry.id === state.siteEvmWallet,
  })),
  ...state.solana.map((entry) => ({
    id: `sol:${entry.info.name}`,
    family: 'sol' as const,
    bridgeId: entry.info.name,
    info: entry.info,
    siteAddress: entry.address,
    isSiteWallet: false,
  })),
  // No site signs in with NEAR here, so NEAR wallets are never read for a
  // site account — they are always connected through the extension.
  ...state.near.map((entry) => ({
    id: `near:${entry.id}`,
    family: 'near' as const,
    bridgeId: entry.id,
    info: entry.info,
    siteAddress: null,
    isSiteWallet: false,
  })),
];

/**
 * Every wallet installed in the browser — EVM (EIP-6963) and Solana (Wallet
 * Standard) — as seen on the site's page, with the account each already
 * shares with the site. Read-only: never prompts, never connects.
 */
export const usePageWallets = (tabId: number | undefined): PageWallets => {
  const [snapshot, setSnapshot] = useState<Snapshot>({ status: 'loading' });

  const refresh = useCallback(async () => {
    if (tabId === undefined) {
      return;
    }

    try {
      setSnapshot({ status: 'ready', state: await pingPage(tabId) });
    } catch {
      setSnapshot({ status: 'no-bridge' });
    }
  }, [tabId]);

  useEffect(() => {
    setSnapshot({ status: 'loading' });
    void refresh();

    const onMessage = (
      message: unknown,
      sender: chrome.runtime.MessageSender,
    ) => {
      if (
        sender.tab?.id === tabId &&
        isChannelMessage(message) &&
        (message as PanelEvent).type === 'event'
      ) {
        void refresh();
      }
    };

    chrome.runtime.onMessage.addListener(onMessage);

    return () => chrome.runtime.onMessage.removeListener(onMessage);
  }, [refresh, tabId]);

  const wallets = useMemo(
    () => (snapshot.status === 'ready' ? toDetected(snapshot.state) : []),
    [snapshot],
  );

  const hasSiteWallet = wallets.some(
    (wallet) => wallet.isSiteWallet && wallet.siteAddress,
  );

  useEffect(() => {
    if (snapshot.status === 'loading' || hasSiteWallet) {
      return;
    }

    const timer = setInterval(() => {
      void refresh();
    }, IDLE_POLL_MS);

    return () => clearInterval(timer);
  }, [snapshot.status, hasSiteWallet, refresh]);

  return snapshot.status === 'ready'
    ? { status: 'ready', wallets }
    : { status: snapshot.status };
};
