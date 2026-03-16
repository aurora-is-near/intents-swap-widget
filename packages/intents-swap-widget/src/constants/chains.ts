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
};

export const CHAIN_IDS_MAP: Partial<Record<Chains, number>> = {
  ...EVM_CHAIN_IDS_MAP,
  near: 397,
};

export const EVM_CHAIN_IDS_MAP_REVERSED: Record<string, EvmChains> =
  Object.fromEntries(
    Object.entries(EVM_CHAIN_IDS_MAP).map(([chain, id]) => [`${id}`, chain]),
  ) as Record<string, EvmChains>;

export const POA_EVM_CHAIN_ID = 'eth:1';

// for other EVM chains use eth:1
export const CHAIN_POA_MAP: Partial<Record<Chains, string>> = {
  base: 'eth:8453',
  arb: 'eth:42161',
  btc: 'btc:mainnet',
  sol: 'sol:mainnet',
  doge: 'doge:mainnet',
  xrp: 'xrp:mainnet',
  zec: 'zec:mainnet',
  gnosis: 'eth:100',
  bera: 'eth:80094',
  tron: 'tron:mainnet',
  bsc: 'eth:56',
  pol: 'eth:137',
  op: 'eth:10',
  avax: 'eth:43114',
  sui: 'sui:mainnet',
  ton: 'ton:mainnet',
  cardano: 'cardano:mainnet',
  ltc: 'ltc:mainnet',
  monad: 'eth:143',
  near: 'near:mainnet',
  stellar: 'stellar:mainnet',
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
  pol: 'MATIC',
  monad: 'MON',
};

export const CHAIN_BASE_TOKENS: Partial<Record<Chains, string>> = {
  ...EVM_CHAIN_BASE_TOKENS,
  sol: 'SOL',
  near: 'NEAR',
  stellar: 'XLM',
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
    icon: 'https://wtmcxrwapthiogjpxwfr.supabase.co/storage/v1/object/public/swap-widget/mon.svg',
  },
};

export const CHAIN_EXPLORERS: Record<number, string> = {
  1: 'https://etherscan.io/tx/', // Ethereum Mainnet
  5: 'https://goerli.etherscan.io/tx/', // Goerli Testnet
  11155111: 'https://sepolia.etherscan.io/tx/', // Sepolia Testnet
  137: 'https://polygonscan.com/tx/', // Polygon Mainnet
  80001: 'https://mumbai.polygonscan.com/tx/', // Polygon Mumbai Testnet
  56: 'https://bscscan.com/tx/', // BSC Mainnet
  97: 'https://testnet.bscscan.com/tx/', // BSC Testnet
  42161: 'https://arbiscan.io/tx/', // Arbitrum One
  421613: 'https://goerli.arbiscan.io/tx/', // Arbitrum Goerli
  421614: 'https://sepolia.arbiscan.io/tx/', // Arbitrum Sepolia
  10: 'https://optimistic.etherscan.io/tx/', // Optimism
  420: 'https://goerli-optimism.etherscan.io/tx/', // Optimism Goerli
  11155420: 'https://sepolia-optimism.etherscan.io/tx/', // Optimism Sepolia
  43114: 'https://snowtrace.io/tx/', // Avalanche C-Chain
  43113: 'https://testnet.snowtrace.io/tx/', // Avalanche Fuji Testnet
  250: 'https://ftmscan.com/tx/', // Fantom Opera
  4002: 'https://testnet.ftmscan.com/tx/', // Fantom Testnet
  8453: 'https://basescan.org/tx/', // Base Mainnet
  84531: 'https://goerli.basescan.org/tx/', // Base Goerli
  84532: 'https://sepolia.basescan.org/tx/', // Base Sepolia
  1313161554: 'https://aurorascan.dev/tx/', // Aurora Mainnet
  1313161555: 'https://testnet.aurorascan.dev/tx/', // Aurora Testnet
  100: 'https://gnosisscan.io/tx/', // Gnosis Chain
  534352: 'https://scrollscan.com/tx/', // Scroll
  534351: 'https://sepolia.scrollscan.com/tx/', // Scroll Sepolia
  59144: 'https://lineascan.build/tx/', // Linea
  59140: 'https://goerli.lineascan.build/tx/', // Linea Goerli
  324: 'https://explorer.zksync.io/tx/', // zkSync Era
  280: 'https://goerli.explorer.zksync.io/tx/', // zkSync Era Goerli
  1101: 'https://zkevm.polygonscan.com/tx/', // Polygon zkEVM
  1442: 'https://testnet-zkevm.polygonscan.com/tx/', // Polygon zkEVM Testnet
  5000: 'https://mantlescan.xyz/tx/', // Mantle
  5001: 'https://explorer.testnet.mantle.xyz/tx/', // Mantle Testnet
  167000: 'https://taikoscan.io/tx/', // Taiko
  167005: 'https://hekla.taikoscan.io/tx/', // Taiko Hekla Testnet
  397: 'https://nearblocks.io/txns/', // Near
};

// some chains e.g. Solana have no chain ID
export const CHAIN_EXPLORERS_BY_CHAIN_NAME: Partial<Record<Chains, string>> = {
  sol: 'https://solscan.io/tx/',
  near: 'https://nearblocks.io/txns/',
  stellar: 'https://stellar.expert/explorer/public/tx/',
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
];
