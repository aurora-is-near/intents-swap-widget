import type { VirtualChainConfig } from '@/types/virtualChain';

export const AURORA_EXIT_PRECOMPILE = '0xE9217BC70B7ED1f598ddD3199e80b093fA71124F';

export const AURORA_CONFIG: VirtualChainConfig = {
  chainId: 'aurora',
  name: 'Aurora',
  isEvm: true,
  exitPrecompile: AURORA_EXIT_PRECOMPILE,
  tokenBridgeMap: {
    '0x8bec47865ade3b172a928df8f990bc7f2a3b9f79':
      'nep141:aaaaaa20d9e0e2461697782ef11675f668207961.factory.bridge.near',
    '0xb12bfca5a55806aaf64e99521918a4bf0fc40802':
      'nep141:a0b86991c6218b36c1d19d4a2e9eb0ce3606eb48.factory.bridge.near',
    '0x4988a896b1227218e4a686fde5eabdcabd91571f':
      'nep141:dac17f958d2ee523a2206206994597c13d831ec7.factory.bridge.near',
    '0xf4eb217ba2454613b15dbdea6e5f22276410e89e':
      'nep141:2260fac5e5542a773aa44fbcfedf7c193bc2c599.factory.bridge.near',
  },
};

export const VIRTUAL_CHAINS: Record<string, VirtualChainConfig> = {
  aurora: AURORA_CONFIG,
};

export function getVirtualChainConfig(
  blockchain: string,
): VirtualChainConfig | null {
  return VIRTUAL_CHAINS[blockchain.toLowerCase()] || null;
}

export function isVirtualChain(blockchain: string): boolean {
  return blockchain.toLowerCase() in VIRTUAL_CHAINS;
}

export function getVirtualChainTokenMapping(
  blockchain: string,
  tokenAddress: string,
): string | null {
  const config = getVirtualChainConfig(blockchain);
  if (!config) return null;

  const normalized = tokenAddress.toLowerCase().replace(/^0x/, '');
  const withPrefix = `0x${normalized}`;

  return config.tokenBridgeMap[withPrefix] || null;
}
