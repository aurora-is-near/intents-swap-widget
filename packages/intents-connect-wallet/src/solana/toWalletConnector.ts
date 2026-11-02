import type { WalletConnector } from '@aurora-is-near/intents-connect';

import type { DetectedSolanaWallet, UnsupportedReason } from '@/detect/types';
import { makeTransfer } from '@/solana/makeTransfer';
import { standardWalletToSolanaProvider } from '@/solana/standardProvider';

const noop = () => Promise.resolve();

/** A detected Solana wallet as an Intents Connect `WalletConnector`. */
export const toSolanaWalletConnector = (
  detected: Pick<DetectedSolanaWallet, 'id' | 'name' | 'address' | 'wallet'>,
  {
    rpcUrl,
  }: {
    /** RPC used to build and submit deposit transfers. */
    rpcUrl?: string;
  } = {},
): {
  connector: WalletConnector | null;
  unsupportedReason?: UnsupportedReason;
} => {
  const { address } = detected;

  if (!address) {
    return { connector: null, unsupportedReason: 'NOT_CONNECTED' };
  }

  const provider = standardWalletToSolanaProvider(detected.wallet, address);

  return {
    connector: {
      id: detected.id,
      name: detected.name,
      chains: ['sol'],
      signingStandard: 'raw_ed25519',
      connect: noop,
      disconnect: noop,
      getAddress: () => address,
      // The Solana address IS the base58 ed25519 public key.
      getPublicKey: () => `ed25519:${address}`,
      getProviders: () => ({ sol: provider }),
      makeTransfer: (args) => makeTransfer(args, { provider, rpcUrl }),
    },
  };
};
