import type { SolanaNetworkPlugin } from '@aurora-is-near/intents-swap-widget';

import { makeTransfer } from './makeTransfer';

export const solana: SolanaNetworkPlugin = {
  makeTransfer,
};
