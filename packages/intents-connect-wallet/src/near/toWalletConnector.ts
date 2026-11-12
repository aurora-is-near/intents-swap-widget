import {
  type NearWalletBase,
  standards,
  type WalletConnector,
} from '@aurora-is-near/intents-connect';

import type { NearConnectorState } from '@/connect/near/useNearConnector';
import { NEAR_NETWORK } from '@/detect/near';
import type { DetectedNearWallet, UnsupportedReason } from '@/detect/types';
import { makeTransfer } from '@/near/makeTransfer';
import type { NearTransactionOutcome, NearTransferWallet } from '@/near/types';

const noop = () => Promise.resolve();

type Result = {
  connector: WalletConnector | null;
  unsupportedReason?: UnsupportedReason;
};

const fromDetected = (
  detected: Pick<
    DetectedNearWallet,
    'id' | 'name' | 'address' | 'publicKey' | 'wallet'
  >,
  rpcUrls?: readonly string[],
): Result => {
  const { address: accountId, publicKey, wallet } = detected;

  if (!accountId) {
    return { connector: null, unsupportedReason: 'NOT_CONNECTED' };
  }

  // The runner resolves the intermediary with it; without it nothing works.
  if (!publicKey) {
    return { connector: null, unsupportedReason: 'MISSING_PUBLIC_KEY' };
  }

  const signer: NearWalletBase = {
    signMessage: async ({ message, recipient, nonce }) => {
      const signed = await wallet.signMessage({
        message,
        recipient,
        nonce,
        network: NEAR_NETWORK,
      });

      return {
        accountId: signed.accountId,
        publicKey: signed.publicKey,
        signature:
          typeof signed.signature === 'string'
            ? signed.signature
            : standards.toBase64(signed.signature),
      };
    },
  };

  const transfers: NearTransferWallet = {
    signAndSendTransactions: ({ transactions }) =>
      wallet.signAndSendTransactions({
        transactions,
        network: NEAR_NETWORK,
      }) as Promise<NearTransactionOutcome[] | undefined>,
  };

  return {
    connector: {
      id: detected.id,
      name: detected.name,
      chains: ['near'],
      signingStandard: 'nep413',
      connect: noop,
      disconnect: noop,
      getAddress: () => accountId,
      getPublicKey: () => publicKey,
      getProviders: () => ({ near: () => signer }),
      makeTransfer: (args) =>
        makeTransfer(args, { wallet: transfers, accountId, rpcUrls }),
    },
  };
};

const fromConnectorState = (
  state: NearConnectorState,
  rpcUrls?: readonly string[],
): Result => {
  const { address, wallet } = state;

  if (!state.isConnected || !address) {
    return { connector: null, unsupportedReason: 'NOT_CONNECTED' };
  }

  if (!state.getPublicKey?.()) {
    return { connector: null, unsupportedReason: 'MISSING_PUBLIC_KEY' };
  }

  return {
    connector: {
      id: state.id,
      name: 'NEAR',
      chains: ['near'],
      signingStandard: 'nep413',
      connect: () => Promise.resolve(state.connect()),
      disconnect: () => Promise.resolve(state.disconnect()),
      getAddress: () => address,
      getPublicKey: state.getPublicKey,
      getProviders: () => state.getProviders?.() ?? {},
      makeTransfer: wallet
        ? (args) => makeTransfer(args, { wallet, accountId: address, rpcUrls })
        : undefined,
    },
  };
};

/**
 * A NEAR wallet as an Intents Connect `WalletConnector` — either one found by
 * `./detect` (injected extension wallets) or the state of `./connect/near`'s
 * `useNearConnector` (any near-connect wallet, including sandboxed ones).
 */
export const toNearWalletConnector = (
  source:
    | Pick<
        DetectedNearWallet,
        'id' | 'name' | 'address' | 'publicKey' | 'wallet' | 'family'
      >
    | NearConnectorState,
  { rpcUrls }: { rpcUrls?: readonly string[] } = {},
): Result =>
  'family' in source && source.family === 'near'
    ? fromDetected(source, rpcUrls)
    : fromConnectorState(source as NearConnectorState, rpcUrls);
