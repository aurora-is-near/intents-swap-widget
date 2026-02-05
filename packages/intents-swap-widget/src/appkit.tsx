'use client';

import { type ReactNode, useEffect, useMemo, useRef, useState } from 'react';
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

// This dynamic import wrapper exists to help avoid module not found issues
// in consuming apps that do not have the @reown packages installed. When using
// Turbopack with Next.js, for example, even though the imports are dynamic it
// still performs static analysis and tries to resolve them at build time.
// eslint-disable-next-line @typescript-eslint/no-unnecessary-type-constraint
const dynamicImport = <T extends unknown = unknown>(path: string): Promise<T> =>
  // eslint-disable-next-line @typescript-eslint/no-unsafe-return, @typescript-eslint/no-implied-eval
  new Function('p', 'return import(p)')(path) as Promise<T>;

type AppKitBridgeProps = {
  children: ReactNode;
};

// Loads the optional @reown dependencies and returns the AppKitBridge component.
// We use dynamic imports to ensure that consumer bundlers do not try to resolve
// these optional packages at build time.
export async function createAppKitBridge(): Promise<{
  AppKitBridge: (props: AppKitBridgeProps) => ReactNode;
}> {
  const [
    { createAppKit, useAppKitAccount, useAppKitProvider, useDisconnect },
    { WagmiAdapter },
    { SolanaAdapter },
    { mainnet, arbitrum, polygon, bsc, optimism, avalanche, base, solana },
  ] = await Promise.all([
    dynamicImport<typeof import('@reown/appkit/react')>('@reown/appkit/react'),
    dynamicImport<typeof import('@reown/appkit-adapter-wagmi')>(
      '@reown/appkit-adapter-wagmi',
    ),
    dynamicImport<typeof import('@reown/appkit-adapter-solana')>(
      '@reown/appkit-adapter-solana',
    ),
    dynamicImport<typeof import('@reown/appkit/networks')>(
      '@reown/appkit/networks',
    ),
  ]);

  const initAppKit = ({
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

  const AppKitBridge = ({ children }: AppKitBridgeProps) => {
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

  return { AppKitBridge };
}
