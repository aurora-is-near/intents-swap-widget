import { EvmProvider } from '@aurora-is-near/intents-swap-widget';

export type MakeTransferOptions = {
  provider: EvmProvider;
  getTransactionLink?: (chainId: number, hash: string) => string;
};
