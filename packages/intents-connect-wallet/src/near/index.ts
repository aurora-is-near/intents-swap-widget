import type { TransferPlugin } from '@aurora-is-near/intents-connect';

import { makeTransfer } from '@/near/makeTransfer';
import type { NearTransferOptions } from '@/near/types';

/**
 * Pass as `plugins: { near }` to `createExecutionRunner`, with
 * `pluginOptions: { wallet }`.
 */
export const near: TransferPlugin<NearTransferOptions> = { makeTransfer };

export { makeTransfer } from '@/near/makeTransfer';
export {
  FT_DEPOSIT_GAS,
  FT_TRANSFER_GAS,
  DEFAULT_RPC_URLS,
} from '@/near/config';
export { getMinStorageBalance, getStorageBalance } from '@/near/storage';
// Re-exported for existing importers; the implementation lives in core.
export {
  viewCall,
  NearContractError,
  NearRpcError,
  NearUnknownAccountError,
} from '@aurora-is-near/intents-connect';
export type {
  NearAction,
  NearTransaction,
  NearTransactionOutcome,
  NearTransferOptions,
  NearTransferWallet,
} from '@/near/types';
export { toNearWalletConnector } from '@/near/toWalletConnector';
