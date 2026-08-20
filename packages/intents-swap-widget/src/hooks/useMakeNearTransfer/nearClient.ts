import type { JsonRpcProvider } from 'near-api-js/lib/providers';
import { snapshot } from 'valtio';

import { configStore } from '@/config';
import { buildNearRpcUrls, nearFailoverRpcProvider } from '@/utils/near/rpc';

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

    // NEAR balances/queries go through the fee-service RPC proxy (prepended at
    // runtime in getNearClient); this is the public failover endpoint.
    near: 'https://free.rpc.fastnear.com',
  },
};

// Public NEAR RPC failover list (the fee-service proxy is prepended at runtime
// in getNearClient based on the configured API key).
const reserveRpcUrls = [settings.rpcUrls.near, 'https://rpc.mainnet.near.org'];

// The proxy URL depends on the runtime API key and environment, so cache the
// client by its complete ordered URL list.
let cache: { urlsKey: string; client: JsonRpcProvider } | undefined;

export const getNearClient = (): JsonRpcProvider => {
  const { apiKey } = snapshot(configStore).config;
  const urls = buildNearRpcUrls(apiKey, reserveRpcUrls);
  const urlsKey = JSON.stringify(urls);

  if (!cache || cache.urlsKey !== urlsKey) {
    cache = {
      urlsKey,
      client: nearFailoverRpcProvider({ urls }),
    };
  }

  return cache.client;
};
