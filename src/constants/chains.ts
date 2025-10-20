import type { Chain, Chains, EvmChains } from '@/types/chain';

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
};

export const CHAIN_IDS_MAP: Partial<Record<Chains, number>> = {
  ...EVM_CHAIN_IDS_MAP,
  near: 397,
};

export const EVM_CHAIN_IDS_MAP_REVERSED: Record<string, EvmChains> =
  Object.fromEntries(
    Object.entries(EVM_CHAIN_IDS_MAP).map(([chain, id]) => [`${id}`, chain]),
  ) as Record<string, EvmChains>;

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
  'cardano',
] as const;

export const CHAINS = [...EVM_CHAINS, ...NOT_EVM_CHAINS] as const;

export const DEFAULT_CHAIN_ICON =
  'https://wtmcxrwapthiogjpxwfr.supabase.co/storage/v1/object/public/swap-widget/unknown.svg';

export const DRY_QUOTE_ADDRESSES = {
  evm: '0x0000000000000000000000000000000000000000',
  sol: '11111111111111111111111111111111',
  near: 'system.near',
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
};

export const CHAIN_BASE_TOKENS: Partial<Record<Chains, string>> = {
  ...EVM_CHAIN_BASE_TOKENS,
  sol: 'SOL',
  near: 'NEAR',
};

export const CHAINS_LIST: Record<Chains, Chain> = {
  near: {
    id: 'near',
    label: 'NEAR',
    icon: 'https://wtmcxrwapthiogjpxwfr.supabase.co/storage/v1/object/public/swap-widget/near.svg',
  },
  eth: {
    id: 'eth',
    label: 'Ethereum',
    icon: 'https://wtmcxrwapthiogjpxwfr.supabase.co/storage/v1/object/public/swap-widget/eth.svg',
  },
  sol: {
    id: 'sol',
    label: 'Solana',
    icon: 'https://wtmcxrwapthiogjpxwfr.supabase.co/storage/v1/object/public/swap-widget/sol.svg',
  },
  base: {
    id: 'base',
    label: 'Base',
    icon: 'https://wtmcxrwapthiogjpxwfr.supabase.co/storage/v1/object/public/swap-widget/base.svg',
  },
  btc: {
    id: 'btc',
    label: 'Bitcoin',
    icon: 'https://wtmcxrwapthiogjpxwfr.supabase.co/storage/v1/object/public/swap-widget/btc.svg',
  },
  gnosis: {
    id: 'gnosis',
    label: 'Gnosis',
    icon: 'https://wtmcxrwapthiogjpxwfr.supabase.co/storage/v1/object/public/swap-widget/gnosis.svg',
  },
  xrp: {
    id: 'xrp',
    label: 'XRP',
    icon: 'https://wtmcxrwapthiogjpxwfr.supabase.co/storage/v1/object/public/swap-widget/xrp.svg',
  },
  bera: {
    id: 'bera',
    label: 'Bera',
    icon: 'https://wtmcxrwapthiogjpxwfr.supabase.co/storage/v1/object/public/swap-widget/bera.svg',
  },
  tron: {
    id: 'tron',
    label: 'Tron',
    icon: 'https://wtmcxrwapthiogjpxwfr.supabase.co/storage/v1/object/public/swap-widget/tron.svg',
  },
  zec: {
    id: 'zec',
    label: 'Zcash',
    icon: 'https://wtmcxrwapthiogjpxwfr.supabase.co/storage/v1/object/public/swap-widget/zec.svg',
  },
  doge: {
    id: 'doge',
    label: 'Dogecoin',
    icon: 'https://wtmcxrwapthiogjpxwfr.supabase.co/storage/v1/object/public/swap-widget/doge.svg',
  },
  arb: {
    id: 'arb',
    label: 'Arbitrum',
    icon: 'https://wtmcxrwapthiogjpxwfr.supabase.co/storage/v1/object/public/swap-widget/arb.svg',
  },
  ton: {
    id: 'ton',
    label: 'Toncoin',
    icon: 'https://wtmcxrwapthiogjpxwfr.supabase.co/storage/v1/object/public/swap-widget/ton.svg',
  },
  op: {
    id: 'op',
    label: 'Optimism',
    icon: 'https://wtmcxrwapthiogjpxwfr.supabase.co/storage/v1/object/public/swap-widget/op.svg',
  },
  avax: {
    id: 'avax',
    label: 'Avalanche',
    icon: 'https://wtmcxrwapthiogjpxwfr.supabase.co/storage/v1/object/public/swap-widget/avax.svg',
  },
  pol: {
    id: 'pol',
    label: 'Polygon',
    icon: 'https://wtmcxrwapthiogjpxwfr.supabase.co/storage/v1/object/public/swap-widget/pol.svg',
  },
  bsc: {
    id: 'bsc',
    label: 'Binance Smart Chain',
    icon: 'https://wtmcxrwapthiogjpxwfr.supabase.co/storage/v1/object/public/swap-widget/bsc.svg',
  },
  sui: {
    id: 'sui',
    label: 'Sui',
    icon: 'https://wtmcxrwapthiogjpxwfr.supabase.co/storage/v1/object/public/swap-widget/sui.svg',
  },
  cardano: {
    id: 'cardano',
    label: 'Cardano',
    icon: 'https://wtmcxrwapthiogjpxwfr.supabase.co/storage/v1/object/public/swap-widget/cardano.svg',
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
  397: 'https://nearblocks.io/txns/',
};
