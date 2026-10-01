import { Transaction, VersionedTransaction } from '@solana/web3.js';

import type { SolanaProvider } from '@aurora-is-near/intents-connect';

import {
  base64ToBytes,
  bytesToBase64,
  SOLANA_METHODS,
} from '../../shared/bridge';
import { requestPage } from './createPageProvider';
import type { TabResolver } from './createPageProvider';

type AnyTransaction = Transaction | VersionedTransaction;

const serialize = (transaction: AnyTransaction) =>
  transaction instanceof VersionedTransaction
    ? transaction.serialize()
    : // Unsigned on purpose: the wallet adds the signature.
      transaction.serialize({
        requireAllSignatures: false,
        verifySignatures: false,
      });

/**
 * A `SolanaProvider` backed by one Solana wallet (by name) in the given tab. Transactions cross the bridge as serialized bytes — the Wallet
 * Standard signs bytes — and come back as the same web3.js type.
 */
export const createSolanaPageProvider = (
  getTabId: TabResolver,
  walletName: string,
  address: string,
): SolanaProvider<AnyTransaction> => ({
  publicKey: { toString: () => address },

  signMessage: async (message) =>
    base64ToBytes(
      await requestPage<string>(await getTabId(), SOLANA_METHODS.signMessage, {
        name: walletName,
        message: bytesToBase64(message),
      }),
    ),

  signTransaction: async (transaction) => {
    const signed = base64ToBytes(
      await requestPage<string>(
        await getTabId(),
        SOLANA_METHODS.signTransaction,
        {
          name: walletName,
          transaction: bytesToBase64(serialize(transaction)),
        },
      ),
    );

    return transaction instanceof VersionedTransaction
      ? VersionedTransaction.deserialize(signed)
      : Transaction.from(signed);
  },
});
