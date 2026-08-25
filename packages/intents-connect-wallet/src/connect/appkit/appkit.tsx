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
  defineChain,
  gnosis,
  mainnet,
  optimism,
  plasma,
  polygon,
  scroll,
  solana as solanaMainnet,
  xLayer,
} from '@reown/appkit/networks';
import { PhantomWalletAdapter } from '@solana/wallet-adapter-phantom';
import { SolflareWalletAdapter } from '@solana/wallet-adapter-solflare';

/** Reown's own theme mode. The widget passed its whole Theme and read only this. */
export type AppKitThemeMode = 'light' | 'dark';

export type AppKitConfig = {
  appName?: string;
  themeMode?: AppKitThemeMode;
  /**
   * WalletConnect Cloud project id.
   *
   * Defaults to Aurora's so this stays drop-in, but production integrations
   * should register their own — the id identifies the dapp to WalletConnect.
   */
  projectId?: string;
  /**
   * Per-chain-id RPC overrides.
   *
   * Reown puts its Blockchain API first for supported EVM chains and the Ethers
   * adapter does not fall back when that endpoint is unavailable. Defaults to
   * `DEFAULT_RPC_OVERRIDES` (publicnode); anything not overridden falls back
   * to the chain's public RPC as defined by viem.
   */
  rpcOverrides?: Readonly<Record<number, string>>;
};

type AppKitProviderProps = AppKitConfig & {
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

const buildCustomRpcUrls = (
  rpcOverrides: Readonly<Record<number, string>> = {},
) =>
  Object.fromEntries(
    appKitNetworks
      .filter((network) => typeof network.id === 'number')
      .map((network) => [
        `eip155:${network.id}`,
        [
          {
            url:
              rpcOverrides[network.id as number] ??
              network.rpcUrls.default.http[0],
          },
        ],
      ]),
  );

const AURORA_WALLETCONNECT_PROJECT_ID = '76f61d4322c80976d1a24a1263a9d082';

/**
 * Default per-chain RPC overrides (publicnode).
 *
 * Reown routes supported EVM chains through its own Blockchain API first, and
 * that endpoint rate-limits under real balance/read traffic (observed as an
 * eth.merkle.io request flood) — the Ethers adapter does not fall back when it
 * refuses. Applied unless the caller passes their own `rpcOverrides`.
 */
export const DEFAULT_RPC_OVERRIDES: Readonly<Record<number, string>> = {
  1: 'https://ethereum-rpc.publicnode.com',
  10: 'https://optimism-rpc.publicnode.com',
  56: 'https://bsc-rpc.publicnode.com',
  100: 'https://gnosis-rpc.publicnode.com',
  137: 'https://polygon-bor-rpc.publicnode.com',
  8453: 'https://base-rpc.publicnode.com',
  42161: 'https://arbitrum-one-rpc.publicnode.com',
  43114: 'https://avalanche-c-chain-rpc.publicnode.com',
  534352: 'https://scroll-rpc.publicnode.com',
};

export const initAppKit = ({
  appName,
  themeMode,
  projectId = AURORA_WALLETCONNECT_PROJECT_ID,
  rpcOverrides = DEFAULT_RPC_OVERRIDES,
}: AppKitConfig = {}) => {
  const ethersAdapter = new EthersAdapter();

  const solanaAdapter = new SolanaAdapter({
    wallets: [new PhantomWalletAdapter(), new SolflareWalletAdapter()],
  });

  const websiteFavicon = findFavicon();

  return createAppKit({
    adapters: [ethersAdapter, solanaAdapter],
    networks: appKitNetworks,
    customRpcUrls: buildCustomRpcUrls(rpcOverrides),
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
    themeMode,
  });
};

export const AppKitContext = createContext<AppKitContextType | undefined>(
  undefined,
);

export const AppKitProvider = ({
  children,
  ...config
}: AppKitProviderProps) => {
  const wasEnabled = useRef(false);
  const [isLoading, setIsLoading] = useState(true);
  const [appKit, setAppKit] = useState<AppKit | null>(null);

  useEffect(() => {
    if (!wasEnabled.current) {
      setAppKit(initAppKit(config));
      wasEnabled.current = true;
    }

    setIsLoading(false);
    // Deliberately empty: AppKit is initialised once per mount, guarded by
    // `wasEnabled`. Re-running when the config object's identity changes would
    // tear down a live connection.
  }, []);

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
