'use client';

import {
  createContext,
  type ReactNode,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import {
  type AppKit,
  createAppKit,
  type CreateAppKit,
} from '@reown/appkit/react';
import { EthersAdapter } from '@reown/appkit-adapter-ethers';
import { SolanaAdapter } from '@reown/appkit-adapter-solana';
import {
  arbitrum,
  avalanche,
  base,
  berachain,
  bsc,
  gnosis,
  mainnet,
  optimism,
  plasma,
  polygon,
  scroll,
  xLayer,
} from 'viem/chains';
import { defineChain } from 'viem';
import { PhantomWalletAdapter } from '@solana/wallet-adapter-phantom';
import { SolflareWalletAdapter } from '@solana/wallet-adapter-solflare';
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

const monadMainnet = defineChain({
  id: 143,
  caipNetworkId: 'eip155:143',
  chainNamespace: 'eip155',
  name: 'Monad',
  nativeCurrency: {
    decimals: 18,
    name: 'Monad',
    symbol: 'MON',
  },
  blockExplorers: {
    default: {
      name: 'Monad Explorer',
      url: 'https://explorer.monad.xyz',
    },
  },
  rpcUrls: {
    default: {
      http: ['https://rpc.monad.xyz'],
    },
  },
});

const adi = defineChain({
  id: 36900,
  caipNetworkId: 'eip155:36900',
  chainNamespace: 'eip155',
  name: 'ADI',
  nativeCurrency: {
    decimals: 18,
    name: 'ADI',
    symbol: 'ADI',
  },
  blockExplorers: {
    default: {
      name: 'ADI Explorer',
      url: 'https://explorer-bls.adifoundation.ai',
    },
  },
  rpcUrls: {
    default: {
      http: ['https://rpc.adifoundation.ai'],
    },
  },
});

const aurora = defineChain({
  id: 1313161554,
  caipNetworkId: 'eip155:1313161554',
  chainNamespace: 'eip155',
  name: 'Aurora',
  nativeCurrency: {
    decimals: 18,
    name: 'Ether',
    symbol: 'ETH',
  },
  blockExplorers: {
    default: {
      name: 'Aurora Explorer',
      url: 'https://explorer.mainnet.aurora.dev',
    },
  },
  rpcUrls: {
    default: {
      http: ['https://mainnet.aurora.dev'],
    },
  },
});

const solanaMainnet = {
  id: '5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp',
  name: 'Solana',
  network: 'solana-mainnet',
  nativeCurrency: { name: 'Solana', symbol: 'SOL', decimals: 9 },
  rpcUrls: {
    default: { http: ['https://rpc.walletconnect.org/v1'] },
  },
  blockExplorers: {
    default: { name: 'Solscan', url: 'https://solscan.io' },
  },
  testnet: false,
  chainNamespace: 'solana',
  caipNetworkId: 'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp',
  deprecatedCaipNetworkId: 'solana:4sGjMW1sUnHzSxGspuhpqLDx6wiyjNtZ',
} as const;

const appKitNetworks = [
  mainnet,
  arbitrum,
  polygon,
  bsc,
  optimism,
  avalanche,
  base,
  solanaMainnet,
  berachain,
  monadMainnet,
  gnosis,
  plasma,
  scroll,
  xLayer,
  adi,
  aurora,
] satisfies CreateAppKit['networks'];

// Reown puts its Blockchain API first for supported EVM chains. The Ethers
// adapter does not fall back when that endpoint is unavailable, so keep the
// networks' own RPC URLs first for balance refreshes.
const customRpcUrls = Object.fromEntries(
  appKitNetworks
    .filter((network) => typeof network.id === 'number')
    .map((network) => [
      `eip155:${network.id}`,
      [{ url: network.rpcUrls.default.http[0] }],
    ]),
);

export const initAppKit = ({
  appName,
  theme,
}: {
  appName?: string;
  theme?: Theme;
}) => {
  const projectId = '76f61d4322c80976d1a24a1263a9d082';

  const ethersAdapter = new EthersAdapter();

  const solanaAdapter = new SolanaAdapter({
    wallets: [new PhantomWalletAdapter(), new SolflareWalletAdapter()],
  });

  const websiteFavicon = findFavicon();

  return createAppKit({
    adapters: [ethersAdapter, solanaAdapter],
    networks: appKitNetworks,
    customRpcUrls,
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
