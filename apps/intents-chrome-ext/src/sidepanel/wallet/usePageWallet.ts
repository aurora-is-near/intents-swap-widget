import { useCallback, useEffect, useMemo, useState } from 'react';

import { EVM_CHAINS } from '@aurora-is-near/intents-connect';
import type { WalletConnector } from '@aurora-is-near/intents-connect';
import { makeTransfer } from '@aurora-is-near/intents-connect-wallet/evm';

import { isChannelMessage } from '../../shared/bridge';
import type { PanelEvent, WalletInfo } from '../../shared/bridge';
import { createPageProvider, pingPage } from './createPageProvider';

/** Re-ping while nothing is connected, so a login on the page shows up. */
const IDLE_POLL_MS = 3000;

export type PageWallet =
  | { status: 'loading' }
  /** No content script answered — the tab predates the install. */
  | { status: 'no-bridge' }
  | { status: 'no-wallet' }
  | {
      status: 'connected';
      address: string;
      chainId: string | null;
      info: WalletInfo;
      connector: WalletConnector;
    };

type Snapshot =
  | { status: 'loading' | 'no-bridge' | 'no-wallet' }
  | {
      status: 'connected';
      address: string;
      chainId: string | null;
      info: WalletInfo;
    };

/**
 * The EVM wallet the page in `tabId` is connected with, exposed as an Intents
 * Connect `WalletConnector`. Signing and the deposit transfer are relayed to
 * that wallet through the page bridge.
 */
export const usePageWallet = (tabId: number | undefined): PageWallet => {
  const [snapshot, setSnapshot] = useState<Snapshot>({ status: 'loading' });

  const refresh = useCallback(async () => {
    if (tabId === undefined) {
      return;
    }

    try {
      const state = await pingPage(tabId);
      const [address] = state.accounts;

      setSnapshot(
        state.wallet && address
          ? {
              status: 'connected',
              address,
              chainId: state.chainId,
              info: state.wallet,
            }
          : { status: 'no-wallet' },
      );
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

  useEffect(() => {
    if (snapshot.status === 'connected' || snapshot.status === 'loading') {
      return;
    }

    const timer = setInterval(() => {
      void refresh();
    }, IDLE_POLL_MS);

    return () => clearInterval(timer);
  }, [snapshot.status, refresh]);

  const provider = useMemo(
    () => (tabId === undefined ? undefined : createPageProvider(tabId)),
    [tabId],
  );

  const address =
    snapshot.status === 'connected' ? snapshot.address : undefined;

  const walletName =
    snapshot.status === 'connected' ? snapshot.info.name : undefined;

  const connector = useMemo<WalletConnector | null>(() => {
    if (!provider || !address || !walletName) {
      return null;
    }

    return {
      id: 'page-evm',
      name: walletName,
      chains: [...EVM_CHAINS],
      signingStandard: 'erc191',
      connect: async () => {
        await provider.request({ method: 'eth_requestAccounts' });
      },
      // The page owns the connection; the panel only borrows it.
      disconnect: () => Promise.resolve(),
      getAddress: () => address,
      getProviders: () => ({ evm: provider }),
      makeTransfer: (args) => makeTransfer(args, { provider }),
      getChainId: async () =>
        Number(await provider.request({ method: 'eth_chainId' })),
    };
  }, [provider, address, walletName]);

  if (snapshot.status === 'connected') {
    return connector ? { ...snapshot, connector } : { status: 'loading' };
  }

  return snapshot;
};
