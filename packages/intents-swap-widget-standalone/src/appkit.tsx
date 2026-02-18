'use client';

import {
  createContext,
  type ReactNode,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import { type AppKit, createAppKit } from '@reown/appkit/react';
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
import type { Theme } from '@aurora-is-near/intents-swap-widget';

type AppKitProviderProps = {
  appName?: string;
  theme?: Theme;
  children: ReactNode;
};

type AppKitContextType = {
  isLoading: boolean;
  appKit: AppKit | null;
};

const findFavicon = (): string | null =>
  document.querySelector<HTMLLinkElement>('link[rel*="icon"]')?.href ?? null;

export const initAppKit = ({
  appName,
  theme,
}: {
  appName?: string;
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
      name: appName ?? 'Intents Swap Widget',
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

export const AppKitContext = createContext<AppKitContextType | undefined>(
  undefined,
);

export const AppKitProvider = ({
  appName,
  theme,
  children,
}: AppKitProviderProps) => {
  const wasEnabled = useRef(false);
  const [isLoading, setIsLoading] = useState(true);
  const [appKit, setAppKit] = useState<AppKit | null>(null);

  useEffect(() => {
    if (!wasEnabled.current) {
      setAppKit(initAppKit({ appName, theme }));
      wasEnabled.current = true;
    }

    setIsLoading(false);
  }, [appName, theme]);

  const value = useMemo(
    () => ({
      isLoading,
      appKit,
    }),
    [isLoading, appKit],
  );

  return (
    <AppKitContext.Provider value={value}>{children}</AppKitContext.Provider>
  );
};
