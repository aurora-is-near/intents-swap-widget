import {
  EVM_CHAINS,
  type WalletConnector,
} from '@aurora-is-near/intents-connect';

import type { DetectedEvmWallet, UnsupportedReason } from '@/detect/types';
import { makeTransfer } from '@/evm/makeTransfer';

// Connecting is the page's job (or `./connect/appkit`); a detected wallet is
// already connected or it is not.
const noop = () => Promise.resolve();

export type EvmWalletConnectorOptions = {
  /** Chains the connector claims. Defaults to every EVM chain the engine routes. */
  chains?: readonly string[];
  /**
   * Report the wallet's chain id to the runner, arming its pre-sign
   * NETWORK_MISMATCH guard. Off by default: the guard fires BEFORE
   * `makeTransfer` gets to switch the wallet to the origin chain, so a wallet
   * on another chain would fail a deposit it could have completed — and QR
   * deposits do not care which chain the wallet is on.
   */
  networkGuard?: boolean;
};

/** A detected EVM wallet as an Intents Connect `WalletConnector`. */
export const toEvmWalletConnector = (
  detected: Pick<DetectedEvmWallet, 'id' | 'name' | 'address' | 'provider'>,
  {
    chains = [...EVM_CHAINS],
    networkGuard = false,
  }: EvmWalletConnectorOptions = {},
): {
  connector: WalletConnector | null;
  unsupportedReason?: UnsupportedReason;
} => {
  const { address, provider } = detected;

  if (!address) {
    return { connector: null, unsupportedReason: 'NOT_CONNECTED' };
  }

  return {
    connector: {
      id: detected.id,
      name: detected.name,
      chains,
      signingStandard: 'erc191',
      connect: noop,
      disconnect: noop,
      getAddress: () => address,
      getProviders: () => ({ evm: provider }),
      makeTransfer: (args) => makeTransfer(args, { provider }),
      ...(networkGuard && {
        getChainId: async () =>
          Number(await provider.request({ method: 'eth_chainId' })),
      }),
    },
  };
};
