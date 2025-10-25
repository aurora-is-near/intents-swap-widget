import { createAppKit } from '@reown/appkit/react';
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

if (!import.meta.env.VITE_REOWN_PROJECT_ID) {
  throw new Error(
    'VITE_REOWN_PROJECT_ID is required. Get your project ID from https://cloud.reown.com',
  );
}

const projectId: string = import.meta.env.VITE_REOWN_PROJECT_ID;
const appUrl = import.meta.env.VITE_APP_URL ?? 'http://localhost:5173';

const metadata = {
  name: 'Intents Swap Widget',
  description: 'Cross-chain swap widget powered by Intents',
  url: appUrl,
  icons: [`${appUrl}/demo/favicon.svg`],
};

const solanaAdapter = new SolanaAdapter({
  wallets: [new PhantomWalletAdapter(), new SolflareWalletAdapter()],
});

createAppKit({
  adapters: [solanaAdapter],
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
