import { useAppKitProvider } from '@reown/appkit/react';
import { Eip1193Provider } from 'ethers';
import type { Provider as SolanaProvider } from '@reown/appkit-adapter-solana/react';

export const useAppKitProviders = () => {
  const { walletProvider: solanaProvider } =
    useAppKitProvider<SolanaProvider>('solana');

  const { walletProvider: evmProvider } =
    useAppKitProvider<Eip1193Provider>('eip155');

  return {
    evm: evmProvider,
    sol: {
      ...solanaProvider,
      signMessage: ({ message }: { message: Uint8Array }) =>
        solanaProvider.signMessage(message),
    },
  };
};
