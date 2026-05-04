import type { SolanaNetworkPlugin } from '@aurora-is-near/intents-swap-widget';

import { makeTransfer } from './makeTransfer';

export const sol: SolanaNetworkPlugin = {
  makeTransfer,
};
