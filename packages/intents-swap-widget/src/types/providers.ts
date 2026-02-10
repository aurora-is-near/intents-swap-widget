import { NearWalletBase } from '@hot-labs/near-connect/build/types/wallet';
import { Eip1193Provider } from 'ethers';
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

export type Providers = {
  sol?: undefined | null | SolanaProvider;
  evm?: undefined | null | EvmProvider;
  near?: undefined | null | (() => NearWalletBase);
};
