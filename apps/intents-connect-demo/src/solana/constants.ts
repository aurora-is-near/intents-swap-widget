export type SolanaBuyToken = {
  symbol: string;
  name: string;
  mint: string;
  decimals: number;
};

// Standard SPL mints; mint accounts and decimals verified on 2026-09-11.
export const BUY_TOKENS: readonly SolanaBuyToken[] = [
  {
    symbol: 'ORCA',
    name: 'Orca',
    mint: 'orcaEKTdK7LKz57vaAYr9QeNsVEPfiu6QeMU1kektZE',
    decimals: 6,
  },
  {
    symbol: 'KMNO',
    name: 'Kamino',
    mint: 'KMNo3nJsBXfcpJTVhZcXLW7RmTwTt4GVFE7suUBo9sS',
    decimals: 6,
  },
];

export const SOLANA_USDC = {
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
export const JUPITER_PROGRAM = 'JUP6LkbZbjS1jKKwapdHNy74zcZ3tLUZoi5QNyVTaV4';

export const getBuyToken = (mint: string): SolanaBuyToken => {
  const token = BUY_TOKENS.find((item) => item.mint === mint);

  if (!token) {
    throw new Error('Select ORCA or KMNO to buy');
  }

  return token;
};
