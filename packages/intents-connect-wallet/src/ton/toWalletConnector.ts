import type { WalletConnector } from '@aurora-is-near/intents-connect';

import type { UnsupportedReason } from '@/detect/types';
import { makeTransfer } from '@/ton/makeTransfer';
import type { TonConnectClient, TonPeer } from '@/ton/types';

const noop = () => Promise.resolve();

export type TonWalletConnectorOptions = {
  /** toncenter-compatible endpoints, for jetton wallets and confirmation. */
  toncenterUrls?: readonly string[];
  /** toncenter's `X-API-Key`. */
  toncenterApiKey?: string;
};

/**
 * The TON Connect session's wallet as an Intents Connect `WalletConnector`:
 * `ton_connect` signing (sign-data text) and deposits through the session.
 *
 * Refused, with a reason, without an account, on the testnet, without a
 * public key (a TON address doesn't carry it) or without text signing.
 */
export const toTonWalletConnector = (
  client: TonConnectClient,
  peer: TonPeer | null,
  options: TonWalletConnectorOptions = {},
): {
  connector: WalletConnector | null;
  unsupportedReason?: UnsupportedReason;
} => {
  if (!peer) {
    return { connector: null, unsupportedReason: 'NOT_CONNECTED' };
  }

  if (!peer.mainnet) {
    return { connector: null, unsupportedReason: 'WRONG_NETWORK' };
  }

  if (!peer.publicKey) {
    return { connector: null, unsupportedReason: 'MISSING_PUBLIC_KEY' };
  }

  if (!peer.signsText) {
    return { connector: null, unsupportedReason: 'NO_SIGN_DATA' };
  }

  const { address, publicKey } = peer;

  return {
    connector: {
      id: `ton:${peer.appName}`,
      name: peer.name,
      chains: ['ton'],
      signingStandard: 'ton_connect',
      connect: noop,
      disconnect: noop,
      getAddress: () => address,
      getPublicKey: () => publicKey,
      getProviders: () => ({
        ton: {
          address,
          publicKey,
          signText: async (text) => {
            // The session holds one wallet: it must still be this one.
            if (client.currentPeer()?.address !== address) {
              throw new Error(
                'The TON wallet changed. Nothing was signed; try again.',
              );
            }

            return client.signText(text);
          },
        },
      }),
      makeTransfer: (args) => makeTransfer(args, { client, ...options }),
    },
  };
};
