import type { WalletConnector } from '@aurora-is-near/intents-connect';

import { isPluggableWallet } from '@/detect/pluggable';
import type { DetectedWallet, UnsupportedReason } from '@/detect/types';
import {
  type EvmWalletConnectorOptions,
  toEvmWalletConnector,
} from '@/evm/toWalletConnector';
import { toNearWalletConnector } from '@/near/toWalletConnector';
import { toSolanaWalletConnector } from '@/solana/toWalletConnector';

/**
 * Options per wallet family, handed to that family's adapter. A plug-in
 * family's options go under its family name too.
 */
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
  stellar?: {
    /** Soroban RPCs for deposit transfers, tried in order. */
    rpcEndpoints?: readonly string[];
  };
  ton?: {
    /** toncenter-compatible endpoints, for jetton wallets and confirmation. */
    toncenterUrls?: readonly string[];
    /** toncenter's `X-API-Key`. */
    toncenterApiKey?: string;
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
  // A plug-in wallet adapts itself, with its family's options, so this
  // entry never imports a plug-in's chain SDK.
  if (isPluggableWallet(detected)) {
    return detected.toConnector(
      (options as Record<string, unknown>)[detected.family],
    );
  }

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
