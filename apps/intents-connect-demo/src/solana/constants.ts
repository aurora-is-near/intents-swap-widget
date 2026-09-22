export type SolanaToken = {
  symbol: string;
  name: string;
  mint: string;
  decimals: number;
};

// The ten largest Solana assets (by market cap, Jupiter verified list) that
// 1Click does not list. Standard SPL mints only: Token-2022 assets such as
// PUMP, PYUSD and USDG are excluded because the demo's ATA handling and setup
// validation support the standard token program alone. Mint owners and
// decimals verified on-chain on 2026-09-22.
export const BUY_TOKENS: readonly SolanaToken[] = [
  {
    symbol: 'JitoSOL',
    name: 'Jito Staked SOL',
    mint: 'J1toso1uCk3RLmjorhTtrVwY9HJ7X8V9yYac6Y7kGCPn',
    decimals: 9,
  },
  {
    symbol: 'BNSOL',
    name: 'Binance Staked SOL',
    mint: 'BNso1VUJnh4zcfpZa6986Ea66P6TCp59hvtNJ8b1X85',
    decimals: 9,
  },
  {
    symbol: 'JUP',
    name: 'Jupiter',
    mint: 'JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN',
    decimals: 6,
  },
  {
    symbol: 'JLP',
    name: 'Jupiter Perps',
    mint: '27G8MtK7VtTcCHkpASjSDdkWWYfoqT6ggEuKidVJidD4',
    decimals: 6,
  },
  {
    symbol: 'RENDER',
    name: 'Render Token',
    mint: 'rndrizKT3MK1iimdxRdWabcF7Zg7AR5T4nud4EkHBof',
    decimals: 8,
  },
  {
    symbol: 'BP',
    name: 'Backpack',
    mint: 'BPxxfRCXkUVhig4HS1Lh7kZqV6SPJhzfEk4x6fVBjPCy',
    decimals: 9,
  },
  {
    symbol: 'JupSOL',
    name: 'Jupiter Staked SOL',
    mint: 'jupSoLaHXQiZZTSfEWMTRRgpnyFm8f6sZdosWBjx93v',
    decimals: 9,
  },
  {
    symbol: 'USDe',
    name: 'Ethena USDe',
    mint: 'DEkqHyPN7GMRJ5cArtQFAWefqbZb33Hyf6s5iCwjEonT',
    decimals: 9,
  },
  {
    symbol: 'PYTH',
    name: 'Pyth Network',
    mint: 'HZ1JovNiVvGrGNiiYvEozEVgZ58xaU3RKwX8eACQBCt3',
    decimals: 6,
  },
  {
    symbol: 'RAY',
    name: 'Raydium',
    mint: '4k3Dyjzvzp8eMZWUXbBCjEvwSkkk59S5iCNLY3QrkX6R',
    decimals: 6,
  },
];

export const SOLANA_USDC: SolanaToken & { assetId: string } = {
  symbol: 'USDC',
  name: 'USD Coin',
  decimals: 6,
  mint: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
  assetId: 'nep141:sol-5ce3bf3a31af18be40ba30f721101b4341690186.omft.near',
};

// Split the bridge's 0.5% budget between fill slippage and the gap between
// preview and real create. Jupiter retains the other 0.5% of the total 1%.
export const BRIDGE_SLIPPAGE_BPS = 25;
export const BRIDGE_AMOUNT_RESERVE_BPS = 25;
export const SWAP_SLIPPAGE_BPS = 50;
export const PREVIEW_VALIDITY_MS = 30_000;
// A fixed SPL transfer's fee does not depend on the amount, so nothing is held
// back from a withdrawal beyond the fee itself; raise if real fees ever exceed
// the dry estimate.
export const WITHDRAW_RESERVE_BPS = 0;
export const JUPITER_PROGRAM = 'JUP6LkbZbjS1jKKwapdHNy74zcZ3tLUZoi5QNyVTaV4';

export const getBuyToken = (mint: string): SolanaToken => {
  const token = BUY_TOKENS.find((item) => item.mint === mint);

  if (!token) {
    throw new Error('Select a supported Solana asset to buy');
  }

  return token;
};
