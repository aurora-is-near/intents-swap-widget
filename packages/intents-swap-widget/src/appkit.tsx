'use client';

import {
  createContext,
  type ReactNode,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import { createAppKit as reownCreateAppKit } from '@reown/appkit/react';
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
import { useTheme } from './hooks/useTheme';
import { Theme } from './types/theme';
import { useConfig } from '@/config';

type AppKitProviderProps = {
  children: ReactNode;
};

type AppKitContextType = { isLoading: boolean };

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

  reownCreateAppKit({
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

export const AppKitContext = createContext<AppKitContextType | undefined>(
  undefined,
);

export const AppKitProvider = ({ children }: AppKitProviderProps) => {
  const wasEnabled = useRef(false);
  const [isLoading, setIsLoading] = useState(true);
  const config = useConfig();
  const theme = useTheme();

  const value = useMemo(() => ({ isLoading }), [isLoading]);

  useEffect(() => {
    if (config.enableStandaloneMode && !wasEnabled.current) {
      initAppKit({ appName: config.appName, theme });

      wasEnabled.current = true;
    }

    setIsLoading(false);
  }, [config, theme]);

  return (
    <AppKitContext.Provider value={value}>{children}</AppKitContext.Provider>
  );
};
