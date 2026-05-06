import { Eip1193Provider } from 'ethers';

import type { NearWalletBase } from './near';

export type EvmProvider = Eip1193Provider | (() => Promise<Eip1193Provider>);

// The any is used here as the Solana transaction type can vary based on the
// libraries used (e.g., web3.js, @solana/solana-web3.js). Without it, we would
// need to duplicate some very complex types for each library or, inline one of
// those libraries as a dependency, which we want to avoid in this package.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type SolanaProvider<TTransaction = any> = {
  publicKey?: { toString(): string } | null;
  signMessage: (message: Uint8Array) => Promise<Uint8Array>;
  signTransaction: (transaction: TTransaction) => Promise<TTransaction>;
};

export type StellarProvider = {
  publicKey?: string;
  signMessage: (
    message: string,
  ) => Promise<{ signedMessage: string; signerAddress: string | undefined }>;
  signTransaction: (
    tx: string,
    options?: { networkPassphrase: string; address: string },
  ) => Promise<
    { signedTxXdr: string; signerAddress: string | undefined } | string
  >;
};

export type Providers = {
  evm?: undefined | null | EvmProvider;
  sol?: undefined | null | SolanaProvider;
  stellar?: undefined | null | StellarProvider;
  near?: undefined | null | (() => NearWalletBase);
};
