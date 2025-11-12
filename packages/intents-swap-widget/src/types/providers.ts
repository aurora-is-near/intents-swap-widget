import { NearWalletBase } from '@hot-labs/near-connect/build/types/wallet';
import { Eip1193Provider } from 'ethers';
import { SolanaWalletAdapter } from '../utils/intents/signers/solana';

export type EvmProvider = Eip1193Provider | (() => Promise<Eip1193Provider>);

export type Providers = {
  sol?: undefined | null | SolanaWalletAdapter;
  evm?: undefined | null | EvmProvider;
  near?: undefined | null | (() => NearWalletBase);
};
