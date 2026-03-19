import type { NearWalletBase } from './near';
import { Eip1193Provider } from 'ethers';
import type { Networks } from '@stellar/stellar-sdk';
import type {
  PublicKey,
  Transaction as SolanaWeb3Transaction,
  VersionedTransaction,
} from '@solana/web3.js';

export type EvmProvider = Eip1193Provider | (() => Promise<Eip1193Provider>);

export type SolanaProvider = {
  publicKey?: PublicKey;
  signMessage: (message: Uint8Array) => Promise<Uint8Array>;
  signTransaction: <T extends SolanaWeb3Transaction | VersionedTransaction>(
    transaction: T,
  ) => Promise<T>;
};

export type StellarProvider = {
  publicKey?: string;
  signMessage: (
    message: string,
  ) => Promise<{ signedMessage: string; signerAddress: string | undefined }>;
  signTransaction: (
    tx: string,
    options?: { networkPassphrase: Networks; address: string },
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
