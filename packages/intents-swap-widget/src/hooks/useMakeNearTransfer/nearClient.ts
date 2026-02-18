import { providers } from 'near-api-js';
import { FailoverRpcProvider } from 'near-api-js/lib/providers';
import type { JsonRpcProvider } from 'near-api-js/lib/providers';

export type SupportedIntentsChainName =
  | 'eth'
  | 'near'
  | 'base'
  | 'arbitrum'
  | 'bitcoin'
  | 'solana'
  | 'dogecoin'
  | 'turbochain'
  | 'tuxappchain'
  | 'vertex'
  | 'optima'
  | 'coineasy'
  | 'aurora'
  | 'xrpledger'
  | 'zcash'
  | 'gnosis'
  | 'berachain'
  | 'tron';

interface Settings {
  swapExpirySec: number;
  quoteMinDeadlineMs: number;
  maxQuoteMinDeadlineMs: number;
  rpcUrls: {
    [key in SupportedIntentsChainName]: string;
  };
}

/**
 * @note This function is specifically designed for NEAR RPC providers and should not be used with other blockchain networks.
 * It creates a failover provider that will automatically switch between the provided RPC endpoints if one fails.
 */
function nearFailoverRpcProvider({ urls }: { urls: string[] }) {
  const rpcProviders = urls.map(
    (url) => new providers.JsonRpcProvider({ url }),
  );

  return createNearFailoverRpcProvider({ rpcProviders });
}

function createNearFailoverRpcProvider({
  rpcProviders,
}: {
  rpcProviders: JsonRpcProvider[];
}) {
  return new FailoverRpcProvider(rpcProviders);
}

const settings: Settings = {
  swapExpirySec: 600, // 10 minutes
  /**
   * Minimum deadline for a quote.
   * The server will return quotes with at least this much time remaining.
   */
  quoteMinDeadlineMs: 60_000,
  /**
   * Max value of minimum deadline for a quote.
   * The server will return quotes with at least this much time remaining.
   */
  maxQuoteMinDeadlineMs: 600_000,
  /**
   * RPC URLs for different blockchains.
   * Ensure these URLs are valid and accessible.
   */
  rpcUrls: {
    near: 'https://relmn.aurora.dev',
    eth: 'https://eth.llamarpc.com',
    base: 'https://mainnet.base.org',
    arbitrum: 'https://arb1.arbitrum.io/rpc',
    bitcoin: 'https://mainnet.bitcoin.org',
    solana: 'https://veriee-t2i7nw-fast-mainnet.helius-rpc.com',
    dogecoin: 'https://go.getblock.io/5f7f5fba970e4f7a907fcd2c5f4c38a2',
    turbochain: 'https://rpc-0x4e45415f.aurora-cloud.dev',
    tuxappchain: 'https://rpc-0x4e454165.aurora-cloud.dev',
    vertex: 'https://rpc-0x4e454173.aurora-cloud.dev',
    optima: 'https://rpc-0x4e454161.aurora-cloud.dev',
    coineasy: 'https://0x4e454218.rpc.aurora-cloud.dev',
    aurora: 'https://mainnet.aurora.dev',
    xrpledger: 'https://xrplcluster.com',
    zcash: 'https://mainnet.lightwalletd.com',
    gnosis: 'https://rpc.gnosischain.com',
    berachain: 'https://rpc.berachain.com',
    tron: '',
  },
};

const reserveRpcUrls = [
  settings.rpcUrls.near,
  'https://free.rpc.fastnear.com',
  'https://rpc.mainnet.near.org',
];

export const nearClient = nearFailoverRpcProvider({
  urls: reserveRpcUrls,
});
