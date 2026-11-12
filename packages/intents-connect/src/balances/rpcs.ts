import type { ChainRpcUrls } from '@/balances/types';

/**
 * Public endpoints per chain — the same set the swap widget ships. NEAR is
 * resolved separately (`balanceRpcUrls`), so it can fall back to the
 * intents-api proxy.
 */
export const DEFAULT_RPCS: Readonly<Record<string, readonly string[]>> = {
  eth: ['https://ethereum-rpc.publicnode.com'],
  arb: ['https://arb1.arbitrum.io/rpc'],
  avax: ['https://api.avax.network/ext/bc/C/rpc'],
  base: ['https://mainnet.base.org'],
  bera: ['https://rpc.berachain.com'],
  bsc: ['https://bsc-dataseed.binance.org/'],
  gnosis: ['https://rpc.gnosischain.com'],
  op: ['https://mainnet.optimism.io'],
  pol: ['https://polygon-bor-rpc.publicnode.com'],
  monad: ['https://rpc.monad.xyz'],
  adi: ['https://rpc.adifoundation.ai'],
  plasma: ['https://rpc.plasma.to'],
  scroll: ['https://rpc.scroll.io'],
  xlayer: ['https://rpc.xlayer.tech'],
  hood: ['https://rpc.mainnet.chain.robinhood.com'],
  aurora: ['https://mainnet.aurora.dev'],
  // publicnode answers 403 to some clients; the official endpoint backs it up.
  // Horizon, not Soroban RPC: balances read `/accounts/{G…}`.
  stellar: ['https://horizon.stellar.org'],
  // TronGrid's account API (`/v1/accounts/{T…}`), not a full node's.
  tron: ['https://api.trongrid.io'],
  // toncenter's v3 API (`walletInformation`, `jetton/wallets`).
  ton: ['https://toncenter.com'],
  sol: [
    'https://solana-rpc.publicnode.com',
    'https://api.mainnet-beta.solana.com',
  ],
};

/**
 * Custom endpoints override the defaults chain by chain: passing only
 * `{ base: [...] }` keeps every other chain on its default. (The widget
 * replaced the whole map, silently dropping every chain not listed.)
 *
 * An empty list disables RPC reads for that chain.
 */
export const resolveRpcs = (custom?: ChainRpcUrls): ChainRpcUrls => ({
  ...DEFAULT_RPCS,
  ...custom,
});
