import type { ChainRpcUrls } from '@/types/chain';

export const DEFAULT_RPCS: ChainRpcUrls = {
  xrp: ['https://rpc.xrplevm.org'],
  tron: ['https://tron.drpc.org'],
  ton: ['https://ton.drpc.org'],
  eth: ['https://eth.drpc.org'],
  bsc: ['https://bsc-dataseed.binance.org/'],
  sui: ['https://sui-mainnet-endpoint.blockvision.org'],
  cardano: ['https://rpc-mainnet-cardano-evm.c1.milkomeda.com'],
  doge: ['https://go.getblock.io/5f7f5fba970e4f7a907fcd2c5f4c38a2'],
  adi: ['https://rpc.adifoundation.ai'],
  plasma: ['https://rpc.plasma.to'],
  scroll: ['https://rpc.scroll.io'],
  xlayer: ['https://rpc.xlayer.tech'],
  aurora: ['https://mainnet.aurora.dev'],

  // The fee-service RPC proxy (keyed by the widget API key) is prepended at
  // runtime in useTokenBalanceRpc; these are the public failover endpoints.
  near: ['https://rpc.mainnet.near.org'],
};
