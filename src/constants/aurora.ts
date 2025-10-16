export const AURORA_CHAIN_CONFIG = {
  chainId: 1313161554,
  chainName: 'Aurora',
  rpcUrl: 'https://mainnet.aurora.dev',
  explorerUrl: 'https://aurorascan.dev',
  nativeCurrency: {
    name: 'Ethereum',
    symbol: 'ETH',
    decimals: 18,
  },
} as const;

export const AURORA_BRIDGE_CONFIG = {
  bridgeContract: 'aurora.factory.bridge.near',
  assetIdPrefix: 'nep141:aurora.factory.bridge.near:',
  exitToNearPrecompile: '0xE9217BC70B7ED1f598ddD3199e80b093fA71124F',
} as const;

export const AURORA_API_ENDPOINTS = {
  tokensApi: 'https://explorer.mainnet.aurora.dev/api/v2/tokens',
  defaultPageSize: 50,
  maxRetries: 3,
  retryDelay: 1000,
} as const;

export const AURORA_TOKEN_FILTERS = {
  includedTypes: ['ERC-20'] as const,
  excludedTypes: ['ERC-721', 'ERC-1155', 'ERC-404'] as const,
  minMarketCap: 1000,
  minHolders: 10,
} as const;
