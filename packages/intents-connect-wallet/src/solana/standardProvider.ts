import { Transaction, VersionedTransaction } from '@solana/web3.js';
import type { SolanaProvider } from '@aurora-is-near/intents-connect';

import { silentConnect, SOLANA_MAINNET } from '@/detect/solana';
import type { StandardWalletAccount, StandardWalletLike } from '@/detect/types';

type AnyTransaction = Transaction | VersionedTransaction;

type SignMessageFeature = {
  signMessage: (
    ...inputs: { account: StandardWalletAccount; message: Uint8Array }[]
  ) => Promise<readonly { signature: Uint8Array }[]>;
};

type SignTransactionFeature = {
  signTransaction: (
    ...inputs: {
      account: StandardWalletAccount;
      transaction: Uint8Array;
      chain: string;
    }[]
  ) => Promise<readonly { signedTransaction: Uint8Array }[]>;
};

const serialize = (transaction: AnyTransaction) =>
  transaction instanceof VersionedTransaction
    ? transaction.serialize()
    : // Unsigned on purpose: the wallet adds the signature.
      transaction.serialize({
        requireAllSignatures: false,
        verifySignatures: false,
      });

/**
 * A Wallet Standard wallet as the `SolanaProvider` the signers and
 * `makeTransfer` expect. The Standard signs bytes, so transactions are
 * serialised in and deserialised back to the same web3.js class.
 *
 * Pinned to `address` when given, so a wallet that switched accounts fails
 * loudly instead of signing with the wrong one. Reconnects silently if the
 * wallet has dropped its accounts (it already trusts the site).
 */
export const standardWalletToSolanaProvider = (
  wallet: StandardWalletLike,
  address?: string,
): SolanaProvider<AnyTransaction> => {
  const resolveAccount = async (): Promise<StandardWalletAccount> => {
    const accounts = wallet.accounts.length
      ? wallet.accounts
      : await silentConnect(wallet);

    const account = address
      ? accounts.find((candidate) => candidate.address === address)
      : accounts[0];

    if (!account) {
      throw new Error(
        address
          ? `${wallet.name} is no longer connected to ${address}`
          : `${wallet.name} shares no account with this site`,
      );
    }

    return account;
  };

  return {
    get publicKey() {
      const current = address ?? wallet.accounts[0]?.address;

      return current ? { toString: () => current } : null;
    },

    signMessage: async (message) => {
      const account = await resolveAccount();
      const [output] = await (
        wallet.features['solana:signMessage'] as SignMessageFeature
      ).signMessage({ account, message });

      if (!output) {
        throw new Error(`${wallet.name} returned no signature`);
      }

      return output.signature;
    },

    signTransaction: async (transaction) => {
      const account = await resolveAccount();
      const [output] = await (
        wallet.features['solana:signTransaction'] as SignTransactionFeature
      ).signTransaction({
        account,
        transaction: serialize(transaction),
        chain: SOLANA_MAINNET,
      });

      if (!output) {
        throw new Error(`${wallet.name} returned no signed transaction`);
      }

      return transaction instanceof VersionedTransaction
        ? VersionedTransaction.deserialize(output.signedTransaction)
        : Transaction.from(output.signedTransaction);
    },
  };
};
