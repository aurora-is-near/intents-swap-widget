import type { EvmNetworkPlugin } from '@aurora-is-near/intents-swap-widget';

import { makeTransfer } from './makeTransfer';

export const evm: EvmNetworkPlugin = {
  makeTransfer,
};
