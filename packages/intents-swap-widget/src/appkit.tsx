'use client';

import { type ReactNode, useEffect, useMemo, useRef, useState } from 'react';
import {
  createAppKit,
  useAppKitAccount,
  useAppKitProvider,
  useDisconnect,
} from '@reown/appkit/react';
import { WagmiAdapter } from '@reown/appkit-adapter-wagmi';
import { SolanaAdapter } from '@reown/appkit-adapter-solana';
import {
  arbitrum,
  avalanche,
  base,
  bsc,
  mainnet,
  optimism,
  polygon,
  solana,
} from '@reown/appkit/networks';
import {
  PhantomWalletAdapter,
  SolflareWalletAdapter,
} from '@solana/wallet-adapter-wallets';
import { Eip1193Provider } from 'ethers';
import type { Provider as SolanaProvider } from '@reown/appkit-adapter-solana/react';
import {
  AppKitContext,
  type AppKitContextType,
} from './providers/AppKitProvider';
import { Theme } from './types/theme';
import { AppKit } from './types/appkit';
import { useConfig } from './config';
import { useTheme } from './hooks/useTheme';

const findFavicon = (): string | null =>
  document.querySelector<HTMLLinkElement>('link[rel*="icon"]')?.href ?? null;

export const initAppKit = ({
  appName,
  theme,
}: {
  appName: string;
  theme?: Theme;
}) => {
  const projectId = '76f61d4322c80976d1a24a1263a9d082';

  const evmNetworks = [
    mainnet,
    arbitrum,
    polygon,
    bsc,
    optimism,
    avalanche,
    base,
  ];

  const wagmiAdapter = new WagmiAdapter({
    networks: evmNetworks,
    projectId,
    ssr: false,
  });

  const solanaAdapter = new SolanaAdapter({
    wallets: [new PhantomWalletAdapter(), new SolflareWalletAdapter()],
  });

  const websiteFavicon = findFavicon();

  return createAppKit({
    adapters: [wagmiAdapter, solanaAdapter],
    // Networks must be inlined here (not spread from evmNetworks array)
    // because TypeScript requires a tuple type for AppKit networks
    networks: [
      mainnet,
      arbitrum,
      polygon,
      bsc,
      optimism,
      avalanche,
      base,
      solana,
    ],
    projectId,
    metadata: {
      name: appName,
      description: 'Cross-chain swap widget powered by Intents',
      url: window.location.origin,
      icons: websiteFavicon ? [websiteFavicon] : [],
    },
    features: {
      analytics: false,
      email: false,
      socials: false,
    },
    themeMode: theme?.colorScheme,
  });
};

type AppKitBridgeProps = {
  children: ReactNode;
};

export const AppKitBridge = ({ children }: AppKitBridgeProps) => {
  const { address } = useAppKitAccount();
  const { disconnect } = useDisconnect();
  const wasEnabled = useRef(false);
  const [isLoading, setIsLoading] = useState(true);
  const [appKit, setAppKit] = useState<AppKit | null>(null);
  const config = useConfig();
  const theme = useTheme();

  const { walletProvider: solanaProvider } =
    useAppKitProvider<SolanaProvider>('solana');

  const { walletProvider: evmProvider } =
    useAppKitProvider<Eip1193Provider>('eip155');

  useEffect(() => {
    if (!wasEnabled.current) {
      setAppKit(initAppKit({ appName: config.appName, theme }));

      wasEnabled.current = true;
    }

    setIsLoading(false);
  }, [config, theme]);

  const value = useMemo(
    (): AppKitContextType => ({
      isLoading,
      appKit,
      address,
      disconnect,
      evmProvider,
      solanaProvider,
    }),
    [appKit, address, disconnect, evmProvider, solanaProvider, isLoading],
  );

  return (
    <AppKitContext.Provider value={value}>{children}</AppKitContext.Provider>
  );
};
