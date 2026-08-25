import type { StellarProvider } from '@aurora-is-near/intents-connect';

export type StellarTransferOptions = {
  provider: StellarProvider;
  /** Override the failover RPC list. */
  rpcEndpoints?: readonly string[];
};
