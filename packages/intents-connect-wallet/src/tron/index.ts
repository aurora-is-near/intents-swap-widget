import type { TransferPlugin } from '@aurora-is-near/intents-connect';

import { makeTransfer } from '@/tron/makeTransfer';
import type { TronTransferOptions } from '@/tron/types';

/**
 * Pass as `plugins: { tron }` to `createExecutionRunner`, with
 * `pluginOptions: { tronWeb }` (the wallet's own).
 */
export const tron: TransferPlugin<TronTransferOptions> = { makeTransfer };

export { makeTransfer, toTronContract } from '@/tron/makeTransfer';
export { requireTronWeb, tronProvider } from '@/tron/provider';
export { toTronWalletConnector } from '@/tron/toWalletConnector';
export type {
  TronBroadcast,
  TronInjectedProvider,
  TronTransaction,
  TronTransactionInfo,
  TronTransferOptions,
  TronWebLike,
} from '@/tron/types';
