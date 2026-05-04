import { Eip1193Provider } from 'ethers';

import type { NearWalletBase } from './near';

export type EvmProvider = Eip1193Provider | (() => Promise<Eip1193Provider>);

export type SolanaProvider = {
  publicKey?: { toString(): string } | null;
  signMessage: (message: Uint8Array) => Promise<Uint8Array>;
  signTransaction: <T>(transaction: T) => Promise<T>;
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
