import { createAppKit } from '@reown/appkit/react';
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

const projectId =
  process.env.VITE_REOWN_PROJECT_ID ?? '6f521f980a016d4308d6cba8b081bc20';

const appUrl = process.env.VITE_APP_URL ?? 'http://localhost:5173';

const metadata = {
  name: 'Intents Swap Widget',
  description: 'Cross-chain swap widget powered by Intents',
  url: appUrl,
  icons: [`${appUrl}/demo/favicon.svg`],
};

const networks = [mainnet, arbitrum, polygon, bsc, optimism, avalanche, base];

export const wagmiAdapter = new WagmiAdapter({
  networks,
  projectId,
  ssr: false,
});

const solanaAdapter = new SolanaAdapter({
  wallets: [new PhantomWalletAdapter(), new SolflareWalletAdapter()],
});

let modalInstance: ReturnType<typeof createAppKit> | null = null;

export function initializeAppKit() {
  if (modalInstance) {
    return modalInstance;
  }

  modalInstance = createAppKit({
    adapters: [wagmiAdapter, solanaAdapter],
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

  return modalInstance;
}
