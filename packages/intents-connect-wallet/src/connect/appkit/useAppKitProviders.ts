import { useAppKitProvider } from '@reown/appkit/react';
import type { Provider as SolanaProvider } from '@reown/appkit-adapter-solana/react';
// Structurally identical to ethers' Eip1193Provider, which is all this needed
// it for — so `ethers` drops out of the dependency set entirely.
import type { Eip1193Provider } from '@aurora-is-near/intents-connect';

export const useAppKitProviders = () => {
  const { walletProvider: solanaProvider } =
    useAppKitProvider<SolanaProvider>('solana');

  const { walletProvider: evmProvider } =
    useAppKitProvider<Eip1193Provider>('eip155');

  return {
    evm: evmProvider,
    sol: solanaProvider,
  };
};
