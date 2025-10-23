import { type ReactNode, useState } from 'react';
import { TonConnectUIProvider } from '@tonconnect/ui-react';
import { WagmiProvider } from 'wagmi';

import { initializeAppKit, wagmiAdapter } from './appkit-config';

interface TonPageProvidersProps {
  children: ReactNode;
}

const getManifestUrl = () => {
  if (typeof window !== 'undefined') {
    return `${window.location.origin}/tonconnect-manifest.json`;
  }

  return '/tonconnect-manifest.json';
};

export function TonPageProviders({ children }: TonPageProvidersProps) {
  // Initialize AppKit synchronously on client-side
  // useState with initializer function ensures it only runs once
  useState(() => {
    if (typeof window !== 'undefined') {
      initializeAppKit();
    }
  });

  return (
    <WagmiProvider config={wagmiAdapter.wagmiConfig}>
      {/*
        TON Connect manifest is served from public/tonconnect-manifest.json

        IMPORTANT: Telegram Wallet cannot access localhost URLs!
        - Browser wallets (Tonkeeper extension) work with localhost
        - Mobile wallets (Telegram Wallet) need a public URL

        For local testing with Telegram Wallet:
        1. Deploy to public URL or use tunneling service
        2. Update public/tonconnect-manifest.json with public URL
      */}
      <TonConnectUIProvider manifestUrl={getManifestUrl()}>
        {children}
      </TonConnectUIProvider>
    </WagmiProvider>
  );
}
