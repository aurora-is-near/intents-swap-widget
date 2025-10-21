import type { ReactNode } from 'react';
import { TonConnectUIProvider } from '@tonconnect/ui-react';
import { WagmiProvider } from 'wagmi';

import { initializeAppKit, wagmiAdapter } from './appkit-config';

interface TonPageProvidersProps {
  children: ReactNode;
}

initializeAppKit();

export function TonPageProviders({ children }: TonPageProvidersProps) {
  return (
    <WagmiProvider config={wagmiAdapter.wagmiConfig}>
      <TonConnectUIProvider manifestUrl="/tonconnect-manifest.json">
        {children}
      </TonConnectUIProvider>
    </WagmiProvider>
  );
}
