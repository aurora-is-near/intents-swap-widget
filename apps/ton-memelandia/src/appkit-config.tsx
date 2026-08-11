import { createAppKit as reownCreateAppKit } from '@reown/appkit/react';
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
import { PhantomWalletAdapter } from '@solana/wallet-adapter-phantom';
import { SolflareWalletAdapter } from '@solana/wallet-adapter-solflare';

const projectId = '76f61d4322c80976d1a24a1263a9d082';
const appUrl = 'https://www.ton-intents.com';

const metadata = {
  name: 'Intents Swap Widget',
  description: 'Cross-chain swap widget powered by Intents',
  url: appUrl,
  icons: [`${appUrl}/favicon.svg`],
};

const ethersAdapter = new EthersAdapter();

const solanaAdapter = new SolanaAdapter({
  wallets: [new PhantomWalletAdapter(), new SolflareWalletAdapter()],
});

export const createAppKit = () => {
  reownCreateAppKit({
    adapters: [ethersAdapter, solanaAdapter],
    // AppKit requires the networks option to have a tuple type.
    networks: [
      mainnet,
      arbitrum,
      polygon,
      bsc,
      optimism,
      avalanche,
      base,
      berachain,
      gnosis,
      plasma,
      scroll,
      xLayer,
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
