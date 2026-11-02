import type { NearWalletBase } from '@aurora-is-near/intents-connect';
import type {
  NearTransaction,
  NearTransactionOutcome,
  NearTransferWallet,
} from '@aurora-is-near/intents-connect-wallet/near';

import { bytesToBase64, NEAR_METHODS } from '../../shared/bridge';
import { requestPage } from './createPageProvider';
import type { TabResolver } from './createPageProvider';

type NearSigned = { accountId: string; publicKey: string; signature: string };

/**
 * The two NEAR wallet surfaces the SDK uses — NEP-413 signing for the
 * execution and `signAndSendTransactions` for the deposit — backed by one
 * NEAR wallet (by manifest id) in the tab `getTabId` resolves to.
 */
export const createNearPageProvider = (
  getTabId: TabResolver,
  walletId: string,
): { signer: NearWalletBase; transfers: NearTransferWallet } => ({
  signer: {
    signMessage: async ({ message, recipient, nonce }) =>
      requestPage<NearSigned>(await getTabId(), NEAR_METHODS.signMessage, {
        id: walletId,
        message,
        recipient,
        nonce: bytesToBase64(nonce),
      }),
  },
  transfers: {
    signAndSendTransactions: async ({
      transactions,
    }: {
      transactions: NearTransaction[];
    }) =>
      requestPage<NearTransactionOutcome[]>(
        await getTabId(),
        NEAR_METHODS.signAndSendTransactions,
        { id: walletId, transactions },
      ),
  },
});
