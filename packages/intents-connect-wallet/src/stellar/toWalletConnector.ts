import {
  standards,
  type StellarProvider,
  type WalletConnector,
} from '@aurora-is-near/intents-connect';

import type { UnsupportedReason } from '@/detect/types';
import { decodePublicKey } from '@/stellar/decodePublicKey';
import { makeTransfer } from '@/stellar/makeTransfer';

const noop = () => Promise.resolve();

export type StellarWalletConnectorOptions = {
  /** Soroban RPCs for deposit transfers, tried in order. */
  rpcEndpoints?: readonly string[];
};

/**
 * A Stellar wallet as an Intents Connect `WalletConnector`: `sep53`
 * signing, memo deposits through `makeTransfer`, and the public key decoded
 * from the `G…` address.
 */
export const toStellarWalletConnector = (
  wallet: {
    id: string;
    name: string;
    address: string | null;
    provider: StellarProvider;
  },
  { rpcEndpoints }: StellarWalletConnectorOptions = {},
): {
  connector: WalletConnector | null;
  unsupportedReason?: UnsupportedReason;
} => {
  const { address, provider } = wallet;

  if (!address) {
    return { connector: null, unsupportedReason: 'NOT_CONNECTED' };
  }

  return {
    connector: {
      id: wallet.id,
      name: wallet.name,
      chains: ['stellar'],
      signingStandard: 'sep53',
      connect: noop,
      disconnect: noop,
      getAddress: () => address,
      getPublicKey: () =>
        `ed25519:${standards.toBase58(decodePublicKey(provider))}`,
      decodePublicKey: () => decodePublicKey(provider),
      getProviders: () => ({ stellar: provider }),
      makeTransfer: (args) => makeTransfer(args, { provider, rpcEndpoints }),
    },
  };
};
