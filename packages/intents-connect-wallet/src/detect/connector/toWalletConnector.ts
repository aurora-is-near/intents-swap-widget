import type { WalletConnector } from '@aurora-is-near/intents-connect';

import type { DetectedWallet, UnsupportedReason } from '@/detect/types';
import {
  type EvmWalletConnectorOptions,
  toEvmWalletConnector,
} from '@/evm/toWalletConnector';
import { toNearWalletConnector } from '@/near/toWalletConnector';
import { toSolanaWalletConnector } from '@/solana/toWalletConnector';

/** Options per wallet family, handed to that family's adapter. */
export type WalletConnectorOptions = {
  evm?: EvmWalletConnectorOptions;
  sol?: {
    /** RPC used to build and submit deposit transfers. */
    rpcUrl?: string;
  };
  near?: {
    /** RPCs used for deposit transfers, tried in order. */
    rpcUrls?: readonly string[];
  };
};

/**
 * Any detected wallet as an Intents Connect `WalletConnector`, through the
 * adapter of its family: `toEvmWalletConnector`, `toSolanaWalletConnector`
 * or `toNearWalletConnector`. Like them, reports an `unsupportedReason`
 * rather than throwing.
 */
export const toWalletConnector = (
  detected: DetectedWallet,
  options: WalletConnectorOptions = {},
): {
  connector: WalletConnector | null;
  unsupportedReason?: UnsupportedReason;
} => {
  switch (detected.family) {
    case 'evm':
      return toEvmWalletConnector(detected, options.evm);
    case 'sol':
      return toSolanaWalletConnector(detected, options.sol);
    case 'near':
      return toNearWalletConnector(detected, options.near);
    default:
      return { connector: null, unsupportedReason: 'NOT_CONNECTED' };
  }
};
