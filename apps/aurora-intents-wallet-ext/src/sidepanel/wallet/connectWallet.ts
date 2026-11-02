import { NEAR_METHODS, SOLANA_METHODS } from '../../shared/bridge';
import { ensureConnectorTab } from './connectorWindow';
import { requestPage } from './createPageProvider';
import type { DetectedWallet } from './types';

type WalletConnection = { address: string; publicKey?: string };

/**
 * Asks the wallet to share an account with the connector page's origin (the
 * prompt names that page). Resolves the account; rejects when the wallet
 * refuses.
 */
export const connectWallet = async (
  wallet: DetectedWallet,
): Promise<WalletConnection> => {
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
