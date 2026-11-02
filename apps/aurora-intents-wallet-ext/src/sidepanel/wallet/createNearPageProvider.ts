import type { NearWalletBase } from '@aurora-is-near/intents-swap-widget';

import { bytesToBase64, NEAR_METHODS } from '../../shared/bridge';
import { requestPage } from './createPageProvider';
import type { TabResolver } from './createPageProvider';

type NearSigned = { accountId: string; publicKey: string; signature: string };

type Outcomes = Awaited<ReturnType<NearWalletBase['signAndSendTransactions']>>;

/**
 * The NEAR wallet surface the widget uses — NEP-413 signing and
 * `signAndSendTransactions` — backed by one NEAR wallet (by manifest id) in
 * the tab `getTabId` resolves to.
 */
export const createNearPageProvider = (
  getTabId: TabResolver,
  walletId: string,
): NearWalletBase => ({
  signMessage: async ({ message, recipient, nonce }) =>
    requestPage<NearSigned>(await getTabId(), NEAR_METHODS.signMessage, {
      id: walletId,
      message,
      recipient,
      nonce: bytesToBase64(nonce),
    }),
  // The bridge returns only each outcome's transaction hash, which is all the
  // widget reads.
  signAndSendTransactions: async ({ transactions }) =>
    requestPage<Outcomes>(
      await getTabId(),
      NEAR_METHODS.signAndSendTransactions,
      { id: walletId, transactions },
    ),
});
