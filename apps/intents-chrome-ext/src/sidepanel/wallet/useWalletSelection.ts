import { useMemo, useState } from 'react';

import type { WalletConnector } from '@aurora-is-near/intents-connect';

import { NEAR_METHODS, SOLANA_METHODS } from '../../shared/bridge';
import { closeConnector, ensureConnectorTab } from './connectorWindow';
import { createConnector } from './connectors';
import { requestPage } from './createPageProvider';
import type { ConnectedWallet, WalletOption } from './types';
import type { PageWallets } from './usePageWallets';
import { useExtensionConnections } from './useExtensionConnections';
import type { ExtensionAccount } from './useExtensionConnections';

export type WalletSelection = {
  /** Every detected wallet, with where (if anywhere) it is connected. */
  options: WalletOption[];
  selected: ConnectedWallet | null;
  connector: WalletConnector | null;
  /**
   * Selects a wallet. One not connected yet is connected to the extension
   * first (its prompt names the connector page, never the site). Resolves
   * `false` when the wallet refused.
   */
  select: (walletId: string) => Promise<boolean>;
  /** Drops the extension's connection to a wallet. */
  disconnect: (walletId: string) => Promise<void>;
  /** Id of the wallet whose connect prompt is open. */
  connecting: string | null;
  error: { walletId: string; message: string } | null;
};

const isConnected = (wallet: WalletOption): wallet is ConnectedWallet =>
  wallet.connection !== null && wallet.address !== null;

const connectOnConnector = async (
  wallet: WalletOption,
): Promise<ExtensionAccount> => {
  const tabId = await ensureConnectorTab();

  if (wallet.family === 'sol') {
    return {
      address: await requestPage<string>(tabId, SOLANA_METHODS.connect, {
        name: wallet.bridgeId,
      }),
    };
  }

  if (wallet.family === 'near') {
    const { accountId, publicKey } = await requestPage<{
      accountId: string;
      publicKey: string;
    }>(tabId, NEAR_METHODS.connect, { id: wallet.bridgeId });

    return { address: accountId, publicKey };
  }

  const [account] = await requestPage<string[]>(
    tabId,
    'eth_requestAccounts',
    undefined,
    wallet.bridgeId,
  );

  if (!account) {
    throw new Error(`${wallet.info.name} did not share an account`);
  }

  return { address: account };
};

/**
 * Which wallet signs and sends deposits.
 *
 * Defaults to the wallet the site is signed in with — already connected, so
 * it is used as-is through the site's tab. Any other detected wallet can be
 * connected to the extension itself (through the connector page) and used
 * from there, independent of the site's own connection.
 */
export const useWalletSelection = (
  siteTabId: number | undefined,
  pageWallets: PageWallets,
): WalletSelection => {
  const { connections, remember, forget } = useExtensionConnections();
  const [chosenId, setChosenId] = useState<string | null>(null);
  const [connecting, setConnecting] = useState<string | null>(null);
  const [error, setError] = useState<WalletSelection['error']>(null);

  const detected = pageWallets.status === 'ready' ? pageWallets.wallets : [];

  const options = detected.map((wallet): WalletOption => {
    // Only the wallet the site is signed in with counts as the site's. Other
    // wallets may also share an account with the site's origin (a login SDK
    // reconnecting a trusted wallet, an old authorization) without the site
    // using them — those go through the extension like any other wallet.
    if (wallet.isSiteWallet && wallet.siteAddress) {
      return { ...wallet, connection: 'site', address: wallet.siteAddress };
    }

    const extension = connections[wallet.id];

    return extension
      ? {
          ...wallet,
          connection: 'extension',
          address: extension.address,
          publicKey: extension.publicKey,
        }
      : { ...wallet, connection: null, address: null };
  });

  const usable = options.filter(isConnected);
  const selected =
    usable.find((wallet) => wallet.id === chosenId) ??
    usable.find((wallet) => wallet.connection === 'site') ??
    null;

  const selectedKey = selected
    ? `${selected.connection}:${selected.id}:${selected.address}`
    : null;

  const connector = useMemo(() => {
    if (!selected) {
      return null;
    }

    if (selected.connection === 'extension') {
      return createConnector(ensureConnectorTab, selected);
    }

    if (siteTabId === undefined) {
      return null;
    }

    return createConnector(() => Promise.resolve(siteTabId), selected);
    // Keyed on connection + account so a re-poll doesn't rebuild the
    // connector (and with it the execution runner).
  }, [siteTabId, selectedKey]);

  const select = async (walletId: string) => {
    const wallet = options.find((option) => option.id === walletId);

    if (!wallet) {
      return false;
    }

    if (isConnected(wallet)) {
      setChosenId(walletId);

      return true;
    }

    setConnecting(walletId);
    setError(null);

    try {
      await remember(walletId, await connectOnConnector(wallet));
      setChosenId(walletId);

      return true;
    } catch (cause) {
      setError({
        walletId,
        message: cause instanceof Error ? cause.message : String(cause),
      });

      return false;
    } finally {
      setConnecting(null);
      // Opened just for this prompt; deposits reopen it when they need it.
      void closeConnector();
    }
  };

  const disconnect = async (walletId: string) => {
    await forget(walletId);

    if (chosenId === walletId) {
      setChosenId(null);
    }
  };

  return {
    options,
    selected,
    connector,
    select,
    disconnect,
    connecting,
    error,
  };
};
