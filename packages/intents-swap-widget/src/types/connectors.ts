import type { EvmProvider, SolanaProvider, StellarProvider } from './providers';
import type { MakeTransferArgs, TransferResult } from './transfer';

type NetworkMap = {
  evm: {
    args: MakeTransferArgs;
    options: {
      provider: EvmProvider;
      getTransactionLink?: (chainId: number, hash: string) => string;
    };
  };
  sol: {
    args: MakeTransferArgs;
    options: {
      provider: SolanaProvider;
      alchemyApiKey: string;
    };
  };
  stellar: {
    args: MakeTransferArgs & { memo?: string };
    options: {
      provider: StellarProvider;
      explorerBaseUrl?: string;
    };
  };
};

type BaseNetworkPlugin<K extends keyof NetworkMap> = {
  makeTransfer: (
    args: NetworkMap[K]['args'],
    options: NetworkMap[K]['options'],
  ) => Promise<TransferResult>;
};

export type EvmNetworkPlugin = BaseNetworkPlugin<'evm'>;

export type SolanaNetworkPlugin = BaseNetworkPlugin<'sol'>;

export type StellarNetworkPlugin = BaseNetworkPlugin<'stellar'> & {
  decodePublicKey: (provider: StellarProvider) => Uint8Array;
  getNativeBalances: (
    provider: StellarProvider,
  ) => Promise<{ xlmStroops: string; usdcStroops: string }>;
};

export type NetworkPlugins = {
  evm?: EvmNetworkPlugin;
  sol?: SolanaNetworkPlugin;
  stellar?: StellarNetworkPlugin;
};
