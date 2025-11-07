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

const projectId = '76f61d4322c80976d1a24a1263a9d082';
const appUrl = 'https://www.ton-intents.com';

const metadata = {
  name: 'Intents Swap Widget',
  description: 'Cross-chain swap widget powered by Intents',
  url: appUrl,
  icons: [`${appUrl}/favicon.svg`],
};

const evmNetworks = [
  mainnet,
  arbitrum,
  polygon,
  bsc,
  optimism,
  avalanche,
  base,
];

export const wagmiAdapter = new WagmiAdapter({
  networks: evmNetworks,
  projectId,
  ssr: false,
});

const solanaAdapter = new SolanaAdapter({
  wallets: [new PhantomWalletAdapter(), new SolflareWalletAdapter()],
});

export const createAppKit = () => {
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
    metadata,
    features: {
      analytics: false,
      email: false,
      socials: false,
    },
    themeMode: 'dark',
    themeVariables: {
      '--w3m-accent': '#6366f1',
    },
  });
};
