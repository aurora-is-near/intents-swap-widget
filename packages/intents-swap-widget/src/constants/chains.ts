import type { Chain, Chains, EvmChains } from '@/types/chain';

export const AURORA_BASE64_LOGO =
  'data:image/svg+xml;base64,PD94bWwgdmVyc2lvbj0iMS4wIiBlbmNvZGluZz0idXRmLTgiPz4KPHN2ZyB2ZXJzaW9uPSIxLjEiIGlkPSJMYXllcl8xIiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHhtbG5zOnhsaW5rPSJodHRwOi8vd3d3LnczLm9yZy8xOTk5L3hsaW5rIiB4PSIwcHgiIHk9IjBweCIKCSB2aWV3Qm94PSIwIDAgMjg4IDI4OCIgc3R5bGU9ImVuYWJsZS1iYWNrZ3JvdW5kOm5ldyAwIDAgMjg4IDI4ODsiIHhtbDpzcGFjZT0icHJlc2VydmUiPgo8c3R5bGUgdHlwZT0idGV4dC9jc3MiPgoJLnN0MHtmaWxsOiMxNjE5MjY7fQoJLnN0MXtmaWxsOiNGRkZGRkY7fQo8L3N0eWxlPgo8cGF0aCBjbGFzcz0ic3QwIiBkPSJNMTQ0LDBMMTQ0LDBjNzkuNSwwLDE0NCw2NC41LDE0NCwxNDR2MGMwLDc5LjUtNjQuNSwxNDQtMTQ0LDE0NGgwQzY0LjUsMjg4LDAsMjIzLjUsMCwxNDR2MAoJQzAsNjQuNSw2NC41LDAsMTQ0LDB6Ii8+CjxwYXRoIGNsYXNzPSJzdDEiIGQ9Ik0xNDQsNTguOGM3LjYsMCwxNC41LDQuMywxNy45LDExLjFsNTYuMiwxMTIuNWM0LjksOS45LDAuOSwyMS45LTksMjYuOGMtMi44LDEuNC01LjgsMi4xLTguOSwyLjFIODcuOAoJYy0xMSwwLTIwLTktMjAtMjBjMC0zLjEsMC43LTYuMiwyLjEtOC45bDU2LjItMTEyLjVDMTI5LjUsNjMsMTM2LjQsNTguNywxNDQsNTguOCBNMTQ0LDQ1Yy0xMi44LDAtMjQuNSw3LjItMzAuMiwxOC43TDU3LjYsMTc2LjIKCWMtOC4zLDE2LjctMS42LDM2LjksMTUuMSw0NS4zYzQuNywyLjMsOS45LDMuNiwxNS4xLDMuNmgxMTIuNWMxOC42LDAsMzMuOC0xNS4xLDMzLjgtMzMuN2MwLTUuMi0xLjItMTAuNC0zLjYtMTUuMUwxNzQuMiw2My43CglDMTY4LjUsNTIuMiwxNTYuOCw0NSwxNDQsNDV6Ii8+Cjwvc3ZnPgo=';

export const EVM_CHAINS = [
  'eth',
  'bera',
  'base',
  'gnosis',
  'arb',
  'bsc',
  'avax',
  'op',
  'pol',
  'monad',
  'adi',
  'plasma',
  'scroll',
  'xlayer',
  'aurora',
] as const;

export const EVM_CHAIN_IDS_MAP: Record<EvmChains, number> = {
  eth: 1,
  bera: 80094,
  base: 8453,
  gnosis: 100,
  arb: 42161,
  avax: 43114,
  bsc: 56,
  op: 10,
  pol: 137,
  monad: 143,
  adi: 36900,
  plasma: 9745,
  scroll: 534352,
  xlayer: 196,
  aurora: 1313161554,
};

export const CHAIN_IDS_MAP: Partial<Record<Chains, number>> = {
  ...EVM_CHAIN_IDS_MAP,
  near: 397,
};

export const NOT_EVM_CHAINS = [
  'sui',
  'xrp',
  'btc',
  'doge',
  'tron',
  'ton',
  'near',
  'sol',
  'zec',
  'ltc',
  'cardano',
  'stellar',
  'aleo',
  'bch',
  'dash',
  'starknet',
] as const;

export const CHAINS = [...EVM_CHAINS, ...NOT_EVM_CHAINS] as const;

export const DRY_QUOTE_ZERO_ADDRESSES = {
  evm: '0x0000000000000000000000000000000000000000',
  sol: '11111111111111111111111111111111',
  near: 'system.near',
  stellar: 'GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF',
} as const;

export const EVM_CHAIN_BASE_TOKENS: Record<EvmChains, string> = {
  eth: 'ETH',
  bera: 'BERA',
  base: 'ETH',
  gnosis: 'XDAI',
  arb: 'ETH',
  avax: 'AVAX',
  bsc: 'BNB',
  op: 'ETH',
  pol: 'POL',
  monad: 'MON',
  adi: 'ADI',
  plasma: 'XPL',
  scroll: 'ETH',
  xlayer: 'OKB',
  aurora: 'ETH',
};

export const CHAIN_BASE_TOKENS: Partial<Record<Chains, string>> = {
  ...EVM_CHAIN_BASE_TOKENS,
  sol: 'SOL',
  near: 'NEAR',
  stellar: 'XLM',
  aleo: 'ALEO',
  bch: 'BCH',
  dash: 'DASH',
  starknet: 'STRK',
};

export const CHAINS_LIST: Record<Chains, Chain> = {
  near: {
    id: 'near',
    label: 'NEAR',
  },
  eth: {
    id: 'eth',
    label: 'Ethereum',
  },
  sol: {
    id: 'sol',
    label: 'Solana',
  },
  base: {
    id: 'base',
    label: 'Base',
  },
  btc: {
    id: 'btc',
    label: 'Bitcoin',
  },
  gnosis: {
    id: 'gnosis',
    label: 'Gnosis',
  },
  xrp: {
    id: 'xrp',
    label: 'XRP',
  },
  bera: {
    id: 'bera',
    label: 'Bera',
  },
  tron: {
    id: 'tron',
    label: 'Tron',
  },
  zec: {
    id: 'zec',
    label: 'Zcash',
  },
  doge: {
    id: 'doge',
    label: 'Dogecoin',
  },
  arb: {
    id: 'arb',
    label: 'Arbitrum',
  },
  ton: {
    id: 'ton',
    label: 'TON',
  },
  op: {
    id: 'op',
    label: 'Optimism',
  },
  avax: {
    id: 'avax',
    label: 'Avalanche',
  },
  pol: {
    id: 'pol',
    label: 'Polygon',
  },
  bsc: {
    id: 'bsc',
    label: 'Binance Smart Chain',
  },
  sui: {
    id: 'sui',
    label: 'Sui',
  },
  cardano: {
    id: 'cardano',
    label: 'Cardano',
  },
  ltc: {
    id: 'ltc',
    label: 'Litecoin',
  },
  stellar: {
    id: 'stellar',
    label: 'Stellar',
  },
  monad: {
    id: 'monad',
    label: 'Monad',
  },
  adi: {
    id: 'adi',
    label: 'ADI',
  },
  aleo: {
    id: 'aleo',
    label: 'Aleo',
  },
  bch: {
    id: 'bch',
    label: 'Bitcoin Cash',
  },
  dash: {
    id: 'dash',
    label: 'Dash',
  },
  plasma: {
    id: 'plasma',
    label: 'Plasma',
  },
  scroll: {
    id: 'scroll',
    label: 'Scroll',
  },
  starknet: {
    id: 'starknet',
    label: 'Starknet',
  },
  xlayer: {
    id: 'xlayer',
    label: 'X Layer',
  },
  aurora: {
    id: 'aurora',
    label: 'Aurora',
  },
};

export const DEFAULT_CHAINS_ORDER: Chains[] = [
  'eth',
  'btc',
  'near',
  'sol',
  'bsc',
  'base',
  'arb',
  'cardano',
  'sui',
  'ton',
  'pol',
  'op',
  'zec',
  'tron',
  'avax',
  'bera',
  'xrp',
  'gnosis',
  'doge',
  'stellar',
  'scroll',
  'xlayer',
  'plasma',
  'starknet',
  'aleo',
  'bch',
  'dash',
  'adi',
  'aurora',
];
