import { useContext } from 'react';
import { AppKitContext } from '../providers/AppKitProvider';
import type { Providers } from '../types/providers';

export const useAppKitProviders = (): Providers => {
  const { solanaProvider, evmProvider } = useContext(AppKitContext) ?? {};

  return {
    evm: evmProvider,
    sol: solanaProvider
      ? {
          ...solanaProvider,
          signMessage: ({ message }: { message: Uint8Array }) =>
            solanaProvider.signMessage(message),
        }
      : undefined,
  };
};
