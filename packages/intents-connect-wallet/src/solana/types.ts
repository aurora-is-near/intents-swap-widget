import type { Connection } from '@solana/web3.js';
import type { SolanaProvider } from '@aurora-is-near/intents-connect';

export type SolanaTransferOptions = {
  provider: SolanaProvider;
  /**
   * RPC endpoint used to fetch a blockhash and submit the transaction.
   *
   * The widget hardcoded an Alchemy URL built from an `alchemyApiKey`. This takes
   * a plain URL instead so the package is not tied to one provider — pass an
   * Alchemy URL if that is what you use.
   */
  rpcUrl?: string;
  /** Supply a pre-configured connection instead of `rpcUrl`. */
  connection?: Connection;
};
