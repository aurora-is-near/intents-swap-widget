import type { ChainRpcUrls } from '@/types/chain';

export const RPCS: ChainRpcUrls = {
  xrp: ['https://rpc.xrplevm.org'],
  tron: ['https://tron.drpc.org'],
  ton: ['https://ton.drpc.org'],
  bsc: ['https://bsc-dataseed.binance.org/'],
  sui: ['https://sui-mainnet-endpoint.blockvision.org'],
  cardano: ['https://rpc-mainnet-cardano-evm.c1.milkomeda.com'],
  doge: ['https://go.getblock.io/5f7f5fba970e4f7a907fcd2c5f4c38a2'],

  // for near we have configured failover so support a list of URLs here
  near: [
    'https://nearrpc.aurora.dev',
    'https://free.rpc.fastnear.com',
    'https://rpc.mainnet.near.org',
  ],

  // Loading balances with Alchemy
  //   sol: 'https://veriee-t2i7nw-fast-mainnet.helius-rpc.com',
  //   eth: 'https://ethereum-rpc.publicnode.com',
  //   bera: 'https://berachain.drpc.org/',
  //   arb: 'https://arb1.arbitrum.io/rpc',
  //   base: 'https://mainnet.base.org',
  //   gnosis: 'https://rpc.gnosischain.com',
  //   avax: 'https://api.avax.network/ext/bc/C/rpc',
  //   op: 'https://mainnet.optimism.io',
  //   pol: 'https://polygon-rpc.com/',

  // No public RPCs / Not supported by Alchemy
  //   btc: undefined,
  //   zec: undefined,
};
