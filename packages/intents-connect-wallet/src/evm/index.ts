import type { TransferPlugin } from '@aurora-is-near/intents-connect';

import { makeTransfer } from '@/evm/makeTransfer';
import type { EvmTransferOptions } from '@/evm/types';

/**
 * Pass as `plugins: { evm }` to `createExecutionRunner`, with
 * `pluginOptions: { provider }`.
 */
export const evm: TransferPlugin<EvmTransferOptions> = { makeTransfer };

export { makeTransfer } from '@/evm/makeTransfer';
export { makeVirtualChainTransfer } from '@/evm/makeVirtualChainTransfer';
export { isEvmAddress, isVirtualChain } from '@/evm/utils';
export type { EvmTransferOptions } from '@/evm/types';
