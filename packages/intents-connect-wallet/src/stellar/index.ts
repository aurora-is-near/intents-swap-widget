import type { TransferPlugin } from '@aurora-is-near/intents-connect';

import { makeTransfer } from '@/stellar/makeTransfer';
import type { StellarTransferOptions } from '@/stellar/types';

/**
 * Pass as `plugins: { stellar }` to `createExecutionRunner`, with
 * `pluginOptions: { provider }`.
 */
export const stellar: TransferPlugin<StellarTransferOptions> = { makeTransfer };

export { makeTransfer } from '@/stellar/makeTransfer';
export { decodePublicKey } from '@/stellar/decodePublicKey';
export { createMemo } from '@/stellar/createMemo';
export { RPC_ENDPOINTS, USDC_ASSET } from '@/stellar/constants';
export type { StellarTransferOptions } from '@/stellar/types';
