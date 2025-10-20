import type { ChainRpcUrls } from '@/types/chain';

export const RPCS: ChainRpcUrls = {
  xrp: ['https://rpc.xrplevm.org'],
  tron: ['https://tron.drpc.org'],
  ton: ['https://ton.drpc.org'],
  bsc: ['https://bsc-dataseed.binance.org/'],
  sui: ['https://sui-mainnet-endpoint.blockvision.org'],
  cardano: ['https://rpc-mainnet-cardano-evm.c1.milkomeda.com'],
  doge: ['https://go.getblock.io/5f7f5fba970e4f7a907fcd2c5f4c38a2'],
  near: [
    'https://nearrpc.aurora.dev',
    'https://free.rpc.fastnear.com',
    'https://rpc.mainnet.near.org',
  ],
};
