import type { TransferPlugin } from '@aurora-is-near/intents-connect';

import { makeTransfer } from '@/ton/makeTransfer';
import type { TonTransferOptions } from '@/ton/types';

/**
 * TON over TON Connect: one session for browser extensions and phones.
 * Needs the optional peers `@tonconnect/sdk` and `@ton/core` (with its peer
 * `@ton/crypto`), and a global `Buffer` in the browser.
 *
 * Pass as `plugins: { ton }` to `createExecutionRunner`, with
 * `pluginOptions: { client }`.
 */
export const ton: TransferPlugin<TonTransferOptions> = { makeTransfer };

export {
  createTonConnectClient,
  type TonConnectClientOptions,
  type TonConnectLike,
} from '@/ton/client';
export { makeTransfer, normalizedMessageHash } from '@/ton/makeTransfer';
export {
  toTonWalletConnector,
  type TonWalletConnectorOptions,
} from '@/ton/toWalletConnector';
export type {
  TonConnectClient,
  TonExtension,
  TonMessage,
  TonPeer,
  TonTransferOptions,
} from '@/ton/types';
