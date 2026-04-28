import type { TronConnector } from '@reown/appkit-adapter-tron';
import { useAppKitProvider } from '@reown/appkit/react';
import { Eip1193Provider } from 'ethers';
import type { Provider as SolanaProvider } from '@reown/appkit-adapter-solana/react';
import { useMemo } from 'react';

export const useAppKitProviders = () => {
  const { walletProvider: solanaProvider } =
    useAppKitProvider<SolanaProvider>('solana');

  const { walletProvider: evmProvider } =
    useAppKitProvider<Eip1193Provider>('eip155');

  const { walletProvider: tronWalletAdapter } =
    useAppKitProvider<TronConnector>('tron');

  const tronProvider = useMemo(() => {
    if (!tronWalletAdapter) {
      return undefined;
    }

    return {
      request: (args: Parameters<typeof tronWalletAdapter.request>[0]) =>
        tronWalletAdapter.request(args),
    };
  }, [tronWalletAdapter]);

  return {
    evm: evmProvider,
    sol: solanaProvider,
    tron: tronProvider,
  };
};
