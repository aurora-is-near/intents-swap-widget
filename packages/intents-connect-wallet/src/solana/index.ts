import type { TransferPlugin } from '@aurora-is-near/intents-connect';

import { makeTransfer } from '@/solana/makeTransfer';
import type { SolanaTransferOptions } from '@/solana/types';

/**
 * Pass as `plugins: { sol }` to `createExecutionRunner`, with
 * `pluginOptions: { provider, rpcUrl }`.
 */
export const sol: TransferPlugin<SolanaTransferOptions> = { makeTransfer };

export { makeTransfer } from '@/solana/makeTransfer';
export type { SolanaTransferOptions } from '@/solana/types';
